package com.enesucar.auth_service.service;

import com.enesucar.auth_service.entity.AuthAudit;
import com.enesucar.auth_service.repository.AuthAuditRepository;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

/** Writes the account audit trail. Callers inside a transaction get the row in that same transaction. */
@Service
public class AuthAuditService {

    public static final String USER_CREATED = "USER_CREATED";
    public static final String USER_REGISTERED = "USER_REGISTERED";
    public static final String USER_DELETED = "USER_DELETED";
    public static final String ROLE_CHANGED = "ROLE_CHANGED";
    public static final String PASSWORD_RESET = "PASSWORD_RESET";
    public static final String PASSWORD_CHANGED = "PASSWORD_CHANGED";
    public static final String LOGIN_SUCCESS = "LOGIN_SUCCESS";
    public static final String LOGIN_FAILED = "LOGIN_FAILED";
    public static final String LOGOUT = "LOGOUT";
    public static final String PASSWORD_CHANGE_FAILED = "PASSWORD_CHANGE_FAILED";
    public static final String BOOTSTRAP_ADMIN_PASSWORD = "BOOTSTRAP_ADMIN_PASSWORD";
    public static final String BOOTSTRAP_DEMO_USER_REMOVED = "BOOTSTRAP_DEMO_USER_REMOVED";

    private final AuthAuditRepository audits;

    public AuthAuditService(AuthAuditRepository audits) {
        this.audits = audits;
    }

    /** The signed-in caller, or "system" when there is none (for example a background job). */
    public static String currentActor() {
        Authentication a = SecurityContextHolder.getContext().getAuthentication();
        return a != null && a.isAuthenticated() && a.getName() != null && !"anonymousUser".equals(a.getName())
                ? a.getName() : "system";
    }

    public void record(String action, String actor, String target, String details) {
        audits.save(new AuthAudit(action, sanitize(actor), sanitize(target), details));
    }

    /** Names typed on the login form are untrusted: no control characters (log forging), at most 100 characters. */
    static String sanitize(String s) {
        if (s == null) {
            return null;
        }
        String clean = s.replaceAll("\\p{Cntrl}", "");
        return clean.length() > 100 ? clean.substring(0, 100) : clean;
    }
}
