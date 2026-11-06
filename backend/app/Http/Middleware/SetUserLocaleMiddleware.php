<?php

namespace HiEvents\Http\Middleware;

use Closure;
use HiEvents\DomainObjects\UserDomainObject;
use HiEvents\Services\Application\Locale\LocaleService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\App;
use Illuminate\Support\Facades\Auth;

class SetUserLocaleMiddleware
{
    public function __construct(private readonly LocaleService $localeService) {}

    public function handle(Request $request, Closure $next)
    {
        $this->setLocale($request);

        return $next($request);
    }

    protected function setLocale(Request $request): void
    {
        if ($this->setLocaleFromCookie($request)) {
            return;
        }

        $this->setLocaleFromUser();
    }

    protected function setLocaleFromCookie(Request $request): bool
    {
        if ($locale = $request->cookie('locale')) {
            App::setLocale($this->localeService->getLocaleOrDefault($locale));

            return true;
        }

        return false;
    }

    protected function setLocaleFromUser(): void
    {
        if (Auth::check()) {
            /** @var UserDomainObject $user */
            $user = UserDomainObject::hydrateFromModel(Auth::user());
            App::setLocale($user->getLocale());
        }
    }
}
