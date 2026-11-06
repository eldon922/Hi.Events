# Set up the Ekklesia server

This guide builds one server that runs the dashboard and the check-in app. Visitors come in through Cloudflare, email goes out through Amazon SES, and a backup runs every night. You run every step yourself. Plan for half a day. Amazon needs about a day to approve sending email, so do steps 1 and 2 first.

The files in `docs/server/` were checked with test tools, not on a real server yet: the Compose file renders with sample settings, Caddy accepts the proxy file and passes the right headers on, and the backup script runs against a stand-in. The first real start is the real test, so read [If something goes wrong](#if-something-goes-wrong) before you begin.

## What you will have

| Address | What it is | Runs as |
|---|---|---|
| `dashboard.ekklesia.web.id` | The dashboard: events, tickets, checkout | `dashboard` |
| `checkin.ekklesia.web.id` | The check-in app for organizers and door volunteers | `checkin-fe` |
| `tiket.ekklesia.web.id` | The check-in app's public pages: registration form and ticket | `checkin-fe` (the same app) |
| `checkin-api.ekklesia.web.id` | The check-in app's data service | `checkin-be` |

`ekklesia.web.id` and `www` (the front page) are not on this server; the Vercel guide covers them. The plan listed the first three addresses. The check-in app needs the fourth for its data service.

A visit takes this road:

```
visitor -> Cloudflare -> tunnel -> Caddy -> the right app
```

- **Cloudflare** answers the visitor, handles the padlock (HTTPS) and keeps your server's address hidden.
- **The tunnel** is a small program (`cloudflared`) on your server. It calls out to Cloudflare and carries the visits in. No web port is open on the server, and there is no certificate to renew.
- **Caddy** reads the address and hands the visit to the right app.

Everything runs with Docker Compose from one file, `docs/server/docker-compose.yml`. It starts the dashboard with its own database (PostgreSQL) and job queue (Redis), and the check-in app (frontend, backend and its own PostgreSQL).

## Before you start

- You own `ekklesia.web.id` and can sign in to the place where you bought it.
- A free Cloudflare account.
- An Amazon Web Services (AWS) account, for email. Sending costs about US$0.10 per 1,000 emails.
- A server (VPS): Ubuntu LTS, 4 CPU cores, 8 GB memory, at least 80 GB disk, in Singapore or Jakarta. Budget US$40 to 60 a month.
- A password manager. You will keep several secrets, and one of them cannot be recovered if you lose it.
- Only if you use Google Sheets for registrations: the Google service-account file from the current check-in server.

## Step 1. Put the domain on Cloudflare

1. In Cloudflare choose **Add a domain**, type `ekklesia.web.id` and pick the **Free** plan.
2. Cloudflare shows two name servers, for example `anna.ns.cloudflare.com`. Cloudflare keeps the address book of the domain from now on.
3. At the place where you bought the domain, replace the domain's name servers with those two. If DNSSEC is switched on there, switch it off first.
4. Back in Cloudflare press **Check nameservers**. The domain shows **Active** after a few minutes to a few hours.
5. Open **SSL/TLS** and set the mode to **Full**. Under **Edge Certificates** turn on **Always Use HTTPS**.

Leave any records Cloudflare found (for example `www`) as they are.

**Check:** the domain shows **Active**.

## Step 2. Set up email with Amazon SES

Both apps send email through Amazon SES in Singapore. The check-in app cannot sign anyone in without it, because sign-in codes arrive by email.

1. Sign in to the AWS console, choose the region **Asia Pacific (Singapore) ap-southeast-1** (top right), and open **Amazon SES**.
2. Open **Identities**, press **Create identity**, choose **Domain** and type `ekklesia.web.id`. Keep **Easy DKIM** on.
3. Open the new identity. Under **Authentication**, set a **Custom MAIL FROM domain**: use `mail.ekklesia.web.id` and the option to reject mail if the record is missing. This makes the email pass the sender check (SPF) under your own name.
4. SES now lists DNS records: three CNAME records for DKIM, and one MX and one TXT record for the MAIL FROM domain. Add each one in Cloudflare under **DNS > Records**, exactly as SES shows it. Set the three CNAME records to **DNS only** (grey cloud), otherwise SES cannot find them.
5. Add one more record, for DMARC, so receivers know what to do with fake mail: type **TXT**, name `_dmarc`, content `v=DMARC1; p=none; rua=mailto:YOUR-ADDRESS` (put an address you read). After two to four weeks without problems, change `p=none` to `p=quarantine`.
6. Wait until the identity shows **Verified** and DKIM shows **Successful**. This takes minutes to a few hours.
7. SES starts in a test mode (the sandbox) that only sends to addresses you verified yourself. On the SES **Account dashboard** press **Request production access**. Say plainly what you send. For example:

   > Ekklesia (https://ekklesia.web.id) is a registration and check-in service for church and community events in Indonesia. We send only transactional email: the ticket after someone registers, sign-in codes for organizers, and a confirmation link to the guardian of an attendee under 18. Every address was typed in by its owner when registering for an event. We keep no purchased lists. We expect about NUMBER emails a day. SES's suppression list is on, we stop writing to any address that bounces or complains, and we watch the reputation dashboard.

   Amazon usually answers within a day. Until then, verify your own address (and the first organizers') as **Email address** identities so you can test.
8. Create the mail login: SES **SMTP settings** > **Create SMTP credentials** > **Create user**. Download the credentials; Amazon shows them once. The user name starts with `AKIA`, and the password is a long text. They belong in `SES_SMTP_USER` and `SES_SMTP_PASSWORD` in step 5. They only work with the Singapore server `email-smtp.ap-southeast-1.amazonaws.com`.

Tip: replies to `hello@ekklesia.web.id` need a real mailbox. In Cloudflare, **Email > Email Routing** (free) can forward `hello@` to your own inbox.

**Check:** the identity is Verified, and the request for production access is sent.

## Step 3. Create and prepare the server

**3a. Create it.** At your server provider create a server with Ubuntu 24.04 LTS (or a newer LTS), 4 cores, 8 GB memory and 80 GB or more disk, in Singapore or Jakarta. Add your SSH key. In the provider's firewall allow only SSH (port 22) in. Turn on the provider's automatic backups or snapshots if they offer them (see step 9).

**3b. Make your own user.** Log in as `root` once:

```bash
adduser ekklesia
usermod -aG sudo ekklesia
mkdir -p /home/ekklesia/.ssh && cp ~/.ssh/authorized_keys /home/ekklesia/.ssh/
chown -R ekklesia:ekklesia /home/ekklesia/.ssh
```

Open a second terminal and check that `ssh ekklesia@SERVER-IP` works.

**3c. Close the doors.** Logged in as `ekklesia`:

```bash
sudo tee /etc/ssh/sshd_config.d/00-ekklesia.conf <<'EOF'
PasswordAuthentication no
PermitRootLogin no
EOF
sudo systemctl restart ssh
sudo ufw allow OpenSSH
sudo ufw --force enable
```

Keep your current window open and test a fresh login before you close it. If the new login fails, you can still fix it from the open window.

**3d. Updates, time zone and a little swap memory** (building the apps needs extra memory for a few minutes):

```bash
sudo apt update && sudo apt -y upgrade
sudo timedatectl set-timezone Asia/Jakarta
sudo fallocate -l 2G /swapfile && sudo chmod 600 /swapfile && sudo mkswap /swapfile && sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

**3e. Docker:**

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ekklesia
echo '{ "log-driver": "local" }' | sudo tee /etc/docker/daemon.json
sudo systemctl restart docker
```

The `log-driver` line stops the log files from filling the disk. Log out and log in again, then run `docker compose version`; it should print a version number.

Docker ignores the `ufw` firewall for ports it publishes. This set-up publishes none, so keep it that way: never add `ports:` to the Compose file.

**Check:** `docker run --rm hello-world` prints a greeting.

## Step 4. Get the code

```bash
sudo mkdir -p /opt/ekklesia/backups && sudo chown -R ekklesia: /opt/ekklesia
cd /opt/ekklesia
git clone --branch develop https://github.com/eldon922/Hi.Events.git dashboard
git clone https://github.com/eldon922/ekklesia-be.git checkin-be
git clone https://github.com/eldon922/ekklesia-fe.git checkin-fe
```

- Until the dashboard pull request is merged into `develop`, use `--branch m2-dashboard` for the first command.
- Run only versions you have tagged. In each check-in folder:

  ```bash
  cd /opt/ekklesia/checkin-be && git checkout "$(git tag --sort=-v:refname | head -1)"
  cd /opt/ekklesia/checkin-fe && git checkout "$(git tag --sort=-v:refname | head -1)"
  ```
- If git asks for a password for the check-in repositories, they are private. On GitHub create a fine-grained token (Settings > Developer settings): only those two repositories, permission **Contents: Read-only**. Run `git config --global credential.helper store`, then use the token as the password. It is remembered after the first time.

**Check:** `ls /opt/ekklesia` shows `backups`, `checkin-be`, `checkin-fe` and `dashboard`.

## Step 5. Fill in the settings

All settings live in one file. Make it from the example and let the server invent the secrets:

```bash
cd /opt/ekklesia/dashboard/docs/server
cp .env.example .env
chmod 600 .env
for name in JWT_SECRET DASHBOARD_DB_PASSWORD CHECKIN_DB_PASSWORD CHECKIN_JWT_SECRET EDGE_KEY REG_IP_SALT; do
  sed -i "s|^$name=\$|$name=$(openssl rand -hex 24)|" .env
done
sed -i "s|^APP_KEY=\$|APP_KEY=base64:$(openssl rand -base64 32)|" .env
```

This only fills lines that are empty, so running it again changes nothing. Then open the file (`nano .env`; save with Ctrl+O, leave with Ctrl+X) and fill in the rest:

- `SES_SMTP_USER` and `SES_SMTP_PASSWORD`: from step 2.
- `MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME`, `MAIL_REPLY_TO`: the sender your emails show.
- `BLAST_PASSWORD`: a password you choose. People type it to start an email blast in the check-in app.
- `VITE_TOS_URL`, `VITE_PRIVACY_URL`, `VITE_ORGANIZER_TERMS_URL`, `VITE_COMMUNITY_GUIDELINES_URL`, `VITE_CONTACT_URL` and `VITE_COMPANY_INFO`: the legal pages and the company line in every footer. Leave a link empty until its page exists; empty links are not shown. Put the company line in quotes, for example `VITE_COMPANY_INFO="PT Contoh, Jl. Merdeka 1, Bandung"`. Fill these in before the dashboard is open to the public.
- `PRIVACY_POLICY_URL_ID` and `PRIVACY_POLICY_URL_EN`: where the Privacy Policy is hosted. Use the same addresses as on the current check-in server.

**Keep a copy of the whole `.env` in your password manager now.** Without `APP_KEY` the dashboard cannot read what it saved. Never put the file in GitHub or in a chat.

Next, the check-in frontend needs three lines at build time, and the Google service-account file must be in place:

```bash
DOMAIN=$(grep '^DOMAIN=' .env | cut -d= -f2)
cat > /opt/ekklesia/checkin-fe/.env <<EOF
NEXT_PUBLIC_EKKLESIA_API_URL=https://checkin-api.$DOMAIN
EKKLESIA_API_INTERNAL_URL=http://checkin-be:4000
PUBLIC_BASE_URL=https://tiket.$DOMAIN
EOF
```

If you use Google Sheets, copy your service-account file to this folder as `service-account.json` (from your own computer: `scp service-account.json ekklesia@SERVER-IP:/opt/ekklesia/dashboard/docs/server/`). If you do not, make an empty one so the start does not stop: `echo '{}' > service-account.json`.

## Step 6. Create the Cloudflare tunnel

1. In Cloudflare open **Zero Trust** (the first time, it asks for a team name and the Free plan; it may ask for a payment method, and the Free plan costs nothing). Go to **Networks > Tunnels** and press **Create a tunnel**. Choose **Cloudflared** and call it `ekklesia`.
2. Choose **Docker**. Cloudflare shows a command. Copy only the long text after `--token`. That token is a password: anyone who has it can run your tunnel.
3. Put it in `.env` as `CLOUDFLARE_TUNNEL_TOKEN=...`.
4. Open the tunnel's **Public Hostnames** tab and add one entry for each address below. For all four, set **Type** to `HTTP` and **URL** to `caddy:80`:

   | Subdomain | Domain |
   |---|---|
   | `dashboard` | `ekklesia.web.id` |
   | `checkin` | `ekklesia.web.id` |
   | `tiket` | `ekklesia.web.id` |
   | `checkin-api` | `ekklesia.web.id` |

Cloudflare creates the DNS records for you. If an address already points to an old server, Cloudflare refuses to add it until you delete the old record. Do that only when you are ready to switch (see step 10).

**Check:** the tunnel is listed with four public hostnames, and `docker compose config -q` (run in `docs/server`) prints nothing. If it names a missing setting, fill that line in `.env`. The tunnel shows **Healthy** after step 7.

## Step 7. Start everything

```bash
cd /opt/ekklesia/dashboard/docs/server
docker compose up -d --build
```

The first start builds three apps and takes 10 to 20 minutes. Then:

```bash
docker compose ps
```

Every line should say `running` (the databases also say `healthy`). Open these in a browser:

- `https://dashboard.ekklesia.web.id`: the sign-in page, in Indonesian.
- `https://checkin.ekklesia.web.id` and `https://tiket.ekklesia.web.id`: the check-in app.
- `https://checkin-api.ekklesia.web.id/health`: a short text saying the service is up.

To read what an app says: `docker compose logs --tail 100 dashboard` (or `checkin-be`, `checkin-fe`, `cloudflared`, `caddy`).

**Check:** all four addresses open, and the tunnel shows **Healthy** in Cloudflare.

## Step 8. First accounts and a first test

**Dashboard.** Open `https://dashboard.ekklesia.web.id/auth/register` and make the first account. If only invited people should sign up after that, set `APP_DISABLE_REGISTRATION=true` in `.env` and run `docker compose up -d`.

**Check-in app.** There is no sign-up page. Make the first organizer on the server:

```bash
docker compose exec checkin-be npm run organizer -- --email you@example.org --name "Your church"
```

It prints a password once; give it to the organizer privately. When that person signs in, a 6-digit code arrives by email. While Amazon's sandbox is still on, that address must be a verified identity (step 2).

**Connecting the two.** The **Buka Check-in** buttons in the dashboard appear by themselves, because `VITE_CHECKIN_APP_URL` points at `checkin.ekklesia.web.id`. For faster updates between the two, add a webhook in the settings of an event in the dashboard: address `https://checkin-api.ekklesia.web.id/hi/webhook`, events `attendee.created`, `attendee.updated`, `attendee.cancelled`, `checkin.created` and `checkin.deleted`. Without it the check-in app still refreshes every 30 seconds while an event is open on a phone.

**Test the email.** Register for a test event with a Gmail address. In Gmail open the message, choose **Show original**, and look for **SPF: PASS**, **DKIM: PASS** and **DMARC: PASS**. If one fails, see the list at the end.

**Free alarm.** A free uptime monitor (for example UptimeRobot) that opens `https://dashboard.ekklesia.web.id` and `https://checkin-api.ekklesia.web.id/health` every five minutes tells you by email when something is down.

## Step 9. Backups

What gets saved, and where:

| What | How | Kept |
|---|---|---|
| Both databases and the dashboard's uploaded images | Nightly script on the server | 14 days on the server, 30 days off the server |
| The whole server disk | Your provider's automatic backups or snapshots | As the provider sets it |
| `.env` (all secrets) and `service-account.json` | You, in your password manager | Always |

**Nightly script.** The script is `docs/server/backup.sh`. Run it once by hand, then put it on a schedule:

```bash
/opt/ekklesia/dashboard/docs/server/backup.sh
ls -lh /opt/ekklesia/backups
crontab -e
```

Add this line at the end of the crontab and save. It runs at 03:15 server time:

```
15 3 * * * /opt/ekklesia/dashboard/docs/server/backup.sh >> /opt/ekklesia/backups/backup.log 2>&1
```

**A copy off the server.** A backup on the same disk is lost with the disk, so send a copy elsewhere. One cheap way is Cloudflare R2: it has a free allowance (10 GB at the time of writing) but asks for a payment method. Make a bucket called `ekklesia-backups` and an API token that can read and write only that bucket, then:

```bash
curl https://rclone.org/install.sh | sudo bash
rclone config create r2 s3 provider=Cloudflare region=auto no_check_bucket=true \
  access_key_id=YOUR-KEY secret_access_key=YOUR-SECRET \
  endpoint=https://YOUR-ACCOUNT-ID.r2.cloudflarestorage.com
rclone lsf r2:ekklesia-backups
```

The last command should print nothing and not complain. Then add `RCLONE_REMOTE=r2:ekklesia-backups` in front of the command in the crontab line, so it reads `15 3 * * * RCLONE_REMOTE=r2:ekklesia-backups /opt/...`. The script then also copies the new files out each night and removes copies older than 30 days.

**Restoring.** Use a file name from `ls /opt/ekklesia/backups`. Stop the app first so nothing writes while you restore. Run these in `/opt/ekklesia/dashboard/docs/server`:

```bash
docker compose stop dashboard
docker compose exec -T dashboard-db pg_restore -U dashboard -d dashboard --clean --if-exists --no-owner < /opt/ekklesia/backups/dashboard-db-DATE.dump
docker compose start dashboard
docker compose exec -T dashboard tar -C /app/backend/storage/app -xzf - < /opt/ekklesia/backups/dashboard-files-DATE.tar.gz

docker compose stop checkin-be
docker compose exec -T checkin-db pg_restore -U ekklesia -d ekklesia --clean --if-exists --no-owner < /opt/ekklesia/backups/checkin-db-DATE.dump
docker compose start checkin-be
```

To rebuild after losing the whole server: do steps 3 to 7 on a new server with the `.env` and `service-account.json` from your password manager (the same tunnel token works on the new server), copy the backup files back (`rclone copy r2:ekklesia-backups /opt/ekklesia/backups`), then restore as above.

**Practise once.** Before the first real event, restore last night's files on a spare server or a spare folder and open the result. A backup you never tried is only a hope.

## Step 10. Moving from the current server

Only if the check-in app already runs somewhere else. Finish steps 1 to 9 first, and choose a quiet time, not within two days of an event.

1. On the old server, stop the check-in backend so nothing changes during the move, then save its database (use the connection details from its settings file):

   ```bash
   pg_dump -Fc "postgresql://USER:PASSWORD@HOST:5432/DATABASE" > ekklesia.dump
   ```
2. Copy `ekklesia.dump` to the new server, then restore it there:

   ```bash
   cd /opt/ekklesia/dashboard/docs/server
   docker compose stop checkin-be
   docker compose exec -T checkin-db pg_restore -U ekklesia -d ekklesia --clean --if-exists --no-owner < ekklesia.dump
   docker compose start checkin-be
   ```
3. In Cloudflare **DNS**, write down and then delete the old records for `checkin`, `tiket` and `checkin-api` (if they exist). In the tunnel's **Public Hostnames** add the three check-in hostnames from step 6.
4. Open the check-in app, sign in, and open an event. Keep the old server for a week.

To go back: delete the three tunnel hostnames, put the old DNS records back, and start the old backend again.

## Updating

Never update in the two days before an event. An update takes a few minutes.

```bash
cd /opt/ekklesia/dashboard && git pull
cd /opt/ekklesia/checkin-be && git fetch --tags && git checkout vX.Y.Z
cd /opt/ekklesia/checkin-fe && git fetch --tags && git checkout vX.Y.Z
cd /opt/ekklesia/dashboard/docs/server
docker compose pull
docker compose build --pull
docker compose up -d
docker image prune -f
```

Replace `vX.Y.Z` with the new tag. To go back after a bad update, check out the previous tag (or commit) in the folder that changed and run the lines from `cd /opt/ekklesia/dashboard/docs/server` down again. Database changes are not undone that way; restore a backup if one went wrong.

## Rules to keep

- **The source code stays public.** Ekklesia's dashboard is a changed copy of Hi.Events, which is AGPL-3.0. Anyone who uses it may ask for the source, and the footer links to it (`Kode sumber`). Keep `eldon922/Hi.Events` public, and push every change to it before it runs on the server. Never change the code on the server by hand.
- **The footer notice stays.** The Hi.Events licence requires the "Powered by" notice on every page and email. Removing it needs a commercial licence from https://hi.events/licensing. The source link stays too.
- **Paid features need a licence.** The files in `ee/` (reserved seating, box office, enterprise sign-on) need one for production use. This set-up does not turn them on.
- **GitHub Actions must be on for the fork.** Open the fork's **Actions** tab and press **I understand my workflows, go ahead and enable them**. Without it the tests never run on pull requests.
- **Secrets stay in `.env` and your password manager.** Not in GitHub, not in chat, not in screenshots.

## Settings reference

Everything you set is in `docs/server/.env`. The Compose file fills in the rest (addresses, databases, queue). The settings:

| Setting | What it does |
|---|---|
| `DOMAIN` | The main domain. All four addresses are made from it. |
| `CLOUDFLARE_TUNNEL_TOKEN` | Lets the server's tunnel program join your Cloudflare tunnel. |
| `APP_KEY` | Locks the data the dashboard saves. Never change it after the first start. |
| `JWT_SECRET` | Signs dashboard sign-ins. Changing it signs everyone out. |
| `DASHBOARD_DB_PASSWORD`, `CHECKIN_DB_PASSWORD` | Passwords of the two databases. Used only inside the server. |
| `CHECKIN_JWT_SECRET` | Signs check-in app sign-ins. Changing it signs everyone out. |
| `EDGE_KEY` | A shared secret between the check-in app's pages and its data service. Lets it tell phones apart for rate limits. |
| `REG_IP_SALT` | Scrambles the visitor address saved with each registration. Changing it makes old entries incomparable. |
| `BLAST_PASSWORD` | Typed by a person to start an email blast in the check-in app. Empty means blasts are refused. |
| `SES_SMTP_HOST`, `SES_SMTP_USER`, `SES_SMTP_PASSWORD` | The Amazon SES mail login. |
| `MAIL_FROM_ADDRESS`, `MAIL_FROM_NAME`, `MAIL_REPLY_TO` | The sender of all emails, and where replies to check-in app emails go. |
| `VITE_APP_NAME` | The name on pages. Default `Ekklesia`. |
| `VITE_TOS_URL`, `VITE_PRIVACY_URL`, `VITE_ORGANIZER_TERMS_URL`, `VITE_COMMUNITY_GUIDELINES_URL`, `VITE_CONTACT_URL` | Legal and contact links in page and email footers. Empty links are not shown. |
| `VITE_COMPANY_INFO` | The company line in every footer (name and address). |
| `APP_DISABLE_REGISTRATION` | `true` closes open sign-up in the dashboard. |
| `PRIVACY_POLICY_URL_ID`, `PRIVACY_POLICY_URL_EN` | Privacy Policy links in the check-in app's registration form and guardian email. |

Two things are fixed by design. The dashboard's language is Indonesian by default; people switch to English from their profile, and there is no setting for the default. The address behind the **Buka Check-in** buttons (`VITE_CHECKIN_APP_URL`) is made from `DOMAIN` by the Compose file.

To change a setting: edit `.env`, then run `docker compose up -d` in `docs/server`. Changing `DOMAIN`, or the three lines in `/opt/ekklesia/checkin-fe/.env`, also needs `docker compose build checkin-fe` first.

## If something goes wrong

| What you see | Likely cause and what to do |
|---|---|
| A Cloudflare error page (1033, 502, 530) | The tunnel is not running. `docker compose logs cloudflared`. Check the token in `.env`. |
| Error 502 or an empty page on one address | That app is not running. `docker compose ps`, then `docker compose logs --tail 100 NAME`. |
| `docker compose up` stops with "bind source path does not exist" | `service-account.json` is missing from `docs/server`. See step 5. |
| `docker compose up` stops at `COPY .env` while building the check-in frontend | The three lines in `/opt/ekklesia/checkin-fe/.env` are missing. See step 5. |
| The first start stops with "out of memory" while building | Add swap (step 3d), or run `docker compose build` for one app at a time. |
| Emails do not arrive | Amazon's sandbox is still on (verify the recipient, or wait for production access). Or the SMTP login is wrong: `docker compose logs dashboard \| grep -i mail`. |
| Emails land in spam, or SPF/DKIM/DMARC fail | The DNS records from step 2 are missing or still waiting. DKIM records must be **DNS only** (grey cloud). |
| Nobody can sign in to the check-in app | It sends a code by email. Fix email first. Check `docker compose logs checkin-be`. |
| Everyone seems to come from one address, or people get "too many requests" | The proxy file `docs/server/Caddyfile` was changed. It must keep the two `header_up` lines. After editing it, run `docker compose restart caddy`. |
| The two apps cannot reach each other over the internet (webhook fails) | Cloudflare's bot protection may block server calls. Look under **Security > Events** in Cloudflare and allow the address. |
| A page still shows old texts after an update | Hard-refresh the browser (Ctrl+Shift+R). If it persists, `docker compose up -d --build`. |

If you need to ask for help, send the output of `docker compose ps` and `docker compose logs --tail 100 NAME`, and leave out `.env`.
