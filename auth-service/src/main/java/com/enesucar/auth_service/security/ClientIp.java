package com.enesucar.auth_service.security;

import jakarta.servlet.http.HttpServletRequest;

import java.net.InetAddress;

/**
 * Best-effort client address for throttling.
 *
 * The auth service sits behind the gateway (and, in a hosted setup, behind a frontend proxy too); each
 * proxy appends the address it saw to X-Forwarded-For. Entries on the left can be forged by the client,
 * entries added by our own proxies are on the right. So the address is the right-most entry that is a
 * public address; if every entry is private (docker network, local development) the right-most entry is
 * used, and without the header the socket's remote address.
 */
public final class ClientIp {

    private ClientIp() {
    }

    public static String resolve(HttpServletRequest request) {
        return resolve(request.getHeader("X-Forwarded-For"), request.getRemoteAddr());
    }

    static String resolve(String forwardedFor, String remoteAddr) {
        if (forwardedFor == null || forwardedFor.isBlank()) {
            return remoteAddr;
        }
        String[] parts = forwardedFor.split(",");
        String lastValid = null;
        for (int i = parts.length - 1; i >= 0; i--) {
            String candidate = parts[i].trim();
            if (!looksLikeIpLiteral(candidate)) {
                continue;
            }
            if (lastValid == null) {
                lastValid = candidate;
            }
            if (isPublic(candidate)) {
                return candidate;
            }
        }
        return lastValid != null ? lastValid : remoteAddr;
    }

    /** Only literal addresses are parsed, so no DNS lookup can be triggered by a forged header. */
    private static boolean looksLikeIpLiteral(String s) {
        return !s.isEmpty() && s.length() <= 45 && s.matches("[0-9a-fA-F:.]+");
    }

    private static boolean isPublic(String literal) {
        try {
            InetAddress a = InetAddress.getByName(literal);
            if (a.isAnyLocalAddress() || a.isLoopbackAddress() || a.isLinkLocalAddress()
                    || a.isSiteLocalAddress() || a.isMulticastAddress()) {
                return false;
            }
            byte[] raw = a.getAddress();
            // IPv6 unique-local addresses (fc00::/7) are private too
            return !(raw.length == 16 && (raw[0] & 0xfe) == 0xfc);
        } catch (Exception e) {
            return false;
        }
    }
}
