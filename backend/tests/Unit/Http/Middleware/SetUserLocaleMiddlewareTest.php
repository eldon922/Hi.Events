<?php

namespace Tests\Unit\Http\Middleware;

use HiEvents\Http\Middleware\SetUserLocaleMiddleware;
use HiEvents\Services\Application\Locale\LocaleService;
use Illuminate\Http\Request;
use Illuminate\Http\Response;
use Illuminate\Support\Facades\App;
use Tests\TestCase;

class SetUserLocaleMiddlewareTest extends TestCase
{
    private SetUserLocaleMiddleware $middleware;

    protected function setUp(): void
    {
        parent::setUp();

        config(['app.locale' => 'id']);
        App::setLocale('id');
        $this->middleware = new SetUserLocaleMiddleware(new LocaleService(config()));
    }

    public function test_the_locale_cookie_picks_the_language(): void
    {
        $this->assertSame('de', $this->localeFor(cookieLocale: 'de'));
    }

    public function test_the_browser_language_is_ignored(): void
    {
        $this->assertSame('id', $this->localeFor(acceptLanguage: 'de-DE,de;q=0.9'));
    }

    public function test_an_unknown_cookie_falls_back_to_the_default_locale(): void
    {
        $this->assertSame('id', $this->localeFor(cookieLocale: 'xx'));
    }

    public function test_english_stays_the_fallback_language(): void
    {
        $this->localeFor(cookieLocale: 'de');

        $this->assertSame('en', App::getFallbackLocale());
    }

    private function localeFor(?string $cookieLocale = null, ?string $acceptLanguage = null): string
    {
        $request = Request::create('/api/test', 'GET', cookies: $cookieLocale === null ? [] : ['locale' => $cookieLocale]);
        if ($acceptLanguage !== null) {
            $request->headers->set('Accept-Language', $acceptLanguage);
        }

        $this->middleware->handle($request, fn () => new Response);

        return App::getLocale();
    }
}
