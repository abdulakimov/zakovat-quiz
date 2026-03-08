# Font Diagnostic Report

- Base URL: http://127.0.0.1:3100
- Created at: 2026-03-08T12:30:02.269Z
- Overall status: FAIL

## Build Font Assets
- Total files: 0

## Page Diagnostics
### login
- URL: http://127.0.0.1:3100/uz/auth/login
- Final URL: chrome-error://chromewebdata/
- Body font-family: 
- --font-sans value: 
- Body font-size: null
- Body font-weight: null
- HTML font-size: null
- document.fonts.status: unknown
- Expected font token found: no
- Fallback-only body font: yes
- Screenshot: .artifacts\screenshots\login.png
- Font requests: 0
- Navigation error: page.goto: net::ERR_TOO_MANY_REDIRECTS at http://127.0.0.1:3100/uz/auth/login
Call log:
[2m  - navigating to "http://127.0.0.1:3100/uz/auth/login", waiting until "networkidle"[22m


### app
- URL: http://127.0.0.1:3100/uz/app
- Final URL: chrome-error://chromewebdata/
- Body font-family: 
- --font-sans value: 
- Body font-size: null
- Body font-weight: null
- HTML font-size: null
- document.fonts.status: unknown
- Expected font token found: no
- Fallback-only body font: yes
- Screenshot: .artifacts\screenshots\app.png
- Font requests: 0
- Navigation error: page.goto: net::ERR_TOO_MANY_REDIRECTS at http://127.0.0.1:3100/uz/app
Call log:
[2m  - navigating to "http://127.0.0.1:3100/uz/app", waiting until "networkidle"[22m


### profile
- URL: http://127.0.0.1:3100/uz/app/profile?tab=profile
- Final URL: chrome-error://chromewebdata/
- Body font-family: 
- --font-sans value: 
- Body font-size: null
- Body font-weight: null
- HTML font-size: null
- document.fonts.status: unknown
- Expected font token found: no
- Fallback-only body font: yes
- Screenshot: .artifacts\screenshots\profile.png
- Font requests: 0
- Navigation error: page.goto: net::ERR_TOO_MANY_REDIRECTS at http://127.0.0.1:3100/uz/app/profile?tab=profile
Call log:
[2m  - navigating to "http://127.0.0.1:3100/uz/app/profile?tab=profile", waiting until "networkidle"[22m


## Fail Reasons
- No font requests were captured.
- Fallback-only body font-family detected on: login, app, profile
- Navigation failed on: login (page.goto: net::ERR_TOO_MANY_REDIRECTS at http://127.0.0.1:3100/uz/auth/login
Call log:
[2m  - navigating to "http://127.0.0.1:3100/uz/auth/login", waiting until "networkidle"[22m
), app (page.goto: net::ERR_TOO_MANY_REDIRECTS at http://127.0.0.1:3100/uz/app
Call log:
[2m  - navigating to "http://127.0.0.1:3100/uz/app", waiting until "networkidle"[22m
), profile (page.goto: net::ERR_TOO_MANY_REDIRECTS at http://127.0.0.1:3100/uz/app/profile?tab=profile
Call log:
[2m  - navigating to "http://127.0.0.1:3100/uz/app/profile?tab=profile", waiting until "networkidle"[22m
)
