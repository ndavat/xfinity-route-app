import { AxiosResponse } from 'axios';

/**
 * Cookie helper functions for managing session cookies
 */

export interface CookieInfo {
  name: string;
  value: string;
  domain?: string;
  path?: string;
  expires?: Date;
  httpOnly?: boolean;
  secure?: boolean;
}

/**
 * Extract cookies from response headers
 * @param response - Axios response object
 * @returns Array of cookie information
 */
export function extractCookiesFromResponse(response: AxiosResponse): CookieInfo[] {
  const cookies: CookieInfo[] = [];
  const setCookieHeader = response.headers['set-cookie'];
  
  if (!setCookieHeader) {
    return cookies;
  }

  // Handle both single cookie and array of cookies
  const cookieHeaders = Array.isArray(setCookieHeader) ? setCookieHeader : [setCookieHeader];
  
  cookieHeaders.forEach(cookieStr => {
    const cookie = parseCookieString(cookieStr);
    if (cookie) {
      cookies.push(cookie);
    }
  });

  return cookies;
}

/**
 * Parse a single cookie string into CookieInfo object
 * @param cookieStr - Cookie string from Set-Cookie header
 * @returns CookieInfo object or null if parsing fails
 */
export function parseCookieString(cookieStr: string): CookieInfo | null {
  if (!cookieStr) return null;

  const parts = cookieStr.split(';').map(p => p.trim());
  if (parts.length === 0) return null;

  // First part is name=value
  const [name, ...valueParts] = parts[0].split('=');
  if (!name) return null;

  const value = valueParts.join('='); // Handle values with = in them
  const cookie: CookieInfo = { name: name.trim(), value: value || '' };

  // Parse additional attributes
  for (let i = 1; i < parts.length; i++) {
    const [attrName, attrValue] = parts[i].split('=');
    const lowerAttrName = attrName.toLowerCase().trim();

    switch (lowerAttrName) {
      case 'domain':
        cookie.domain = attrValue?.trim();
        break;
      case 'path':
        cookie.path = attrValue?.trim();
        break;
      case 'expires':
        if (attrValue) {
          const expires = new Date(attrValue.trim());
          if (!isNaN(expires.getTime())) {
            cookie.expires = expires;
          }
        }
        break;
      case 'httponly':
        cookie.httpOnly = true;
        break;
      case 'secure':
        cookie.secure = true;
        break;
    }
  }

  return cookie;
}

/**
 * Extract session ID from cookies
 * @param cookies - Array of cookies
 * @param sessionCookieName - Name of the session cookie (default: 'SESSIONID')
 * @returns Session ID or null if not found
 */
export function extractSessionId(cookies: CookieInfo[], sessionCookieName: string = 'SESSIONID'): string | null {
  const sessionCookie = cookies.find(cookie => cookie.name === sessionCookieName);
  return sessionCookie?.value || null;
}

/**
 * Build cookie header string from cookies
 * @param cookies - Array of cookies
 * @returns Cookie header string
 */
export function buildCookieHeader(cookies: CookieInfo[]): string {
  return cookies.map(cookie => `${cookie.name}=${cookie.value}`).join('; ');
}

/**
 * Update axios instance default headers with cookie
 * @param axiosInstance - Axios instance to update
 * @param cookieValue - Cookie header value
 */
export function updateAxiosInstanceCookie(axiosInstance: any, cookieValue: string | null) {
  if (cookieValue) {
    axiosInstance.defaults.headers.common['Cookie'] = cookieValue;
  } else {
    delete axiosInstance.defaults.headers.common['Cookie'];
  }
}

/**
 * Extract and update session cookie in axios instance
 * @param response - Axios response
 * @param axiosInstance - Axios instance to update
 * @param sessionCookieName - Name of the session cookie
 * @returns Session ID if found
 */
export function handleSessionCookie(
  response: AxiosResponse, 
  axiosInstance: any, 
  sessionCookieName: string = 'SESSIONID'
): string | null {
  const cookies = extractCookiesFromResponse(response);
  const sessionId = extractSessionId(cookies, sessionCookieName);
  
  if (sessionId) {
    updateAxiosInstanceCookie(axiosInstance, `${sessionCookieName}=${sessionId}`);
  }
  
  return sessionId;
}
