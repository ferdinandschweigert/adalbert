import { NextRequest, NextResponse } from 'next/server';
import {
  ENTRY_BYPASS_QUERY,
  buildEntryCookieHeader,
  hasAdminGatePass,
  hasEntryCookie,
  isAdminPathAlwaysAllowed,
  isEntryGateEnabled,
  refererMatchesAllowedOrigin,
  verifyBypassSecret,
} from '@/lib/entryGate';

function isSecureRequest(request: NextRequest): boolean {
  return request.nextUrl.protocol === 'https:' || process.env.NODE_ENV === 'production';
}

function withEntryCookie(response: NextResponse, request: NextRequest): NextResponse {
  response.headers.append('Set-Cookie', buildEntryCookieHeader(isSecureRequest(request)));
  return response;
}

function denyGate(): NextResponse {
  const html = `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="robots" content="noindex, nofollow" />
  <title>Zugang nur über AltklausurenDB</title>
  <style>
    :root { color-scheme: light; }
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      font-family: Georgia, "Times New Roman", serif;
      background: linear-gradient(160deg, #f3efe6 0%, #e4ece8 45%, #d7e0f0 100%);
      color: #1c2430;
      padding: 1.5rem;
    }
    main {
      max-width: 28rem;
      text-align: center;
      line-height: 1.5;
    }
    h1 { font-size: 1.5rem; margin: 0 0 0.75rem; font-weight: 600; }
    p { margin: 0 0 1rem; font-size: 1rem; opacity: 0.9; }
    a {
      color: #0f4c5c;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <main>
    <h1>Zugang nur über AltklausurenDB</h1>
    <p>Adalbert ist über einen Link von AltklausurenDB erreichbar — nicht als direkte öffentliche Seite.</p>
    <p><a href="https://www.altklausurendb.de">Zur AltklausurenDB</a></p>
  </main>
</body>
</html>`;
  return new NextResponse(html, {
    status: 403,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

export async function middleware(request: NextRequest) {
  if (!isEntryGateEnabled()) {
    return NextResponse.next();
  }

  const { pathname, searchParams } = request.nextUrl;

  // Admin UI / admin APIs always reachable (login without prior referer).
  if (isAdminPathAlwaysAllowed(pathname)) {
    const response = NextResponse.next();
    if (await hasAdminGatePass(request)) {
      return withEntryCookie(response, request);
    }
    return response;
  }

  // Admin bypass bookmark: /?gate=<ENTRY_GATE_BYPASS_SECRET>
  const bypassValue = searchParams.get(ENTRY_BYPASS_QUERY);
  if (bypassValue !== null && verifyBypassSecret(bypassValue)) {
    const cleanUrl = request.nextUrl.clone();
    cleanUrl.searchParams.delete(ENTRY_BYPASS_QUERY);
    // Prefer landing on home when gate was the only query; keep other params.
    if ([...cleanUrl.searchParams.keys()].length === 0 && pathname === '/') {
      cleanUrl.pathname = '/';
    }
    return withEntryCookie(NextResponse.redirect(cleanUrl), request);
  }

  if (hasEntryCookie(request)) {
    return NextResponse.next();
  }

  if (await hasAdminGatePass(request)) {
    return withEntryCookie(NextResponse.next(), request);
  }

  const referer = request.headers.get('referer');
  if (refererMatchesAllowedOrigin(referer)) {
    return withEntryCookie(NextResponse.next(), request);
  }

  return denyGate();
}

export const config = {
  matcher: [
    /*
     * Match all paths except static assets Next serves directly.
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js|map|txt|xml|woff2?)$).*)',
  ],
};
