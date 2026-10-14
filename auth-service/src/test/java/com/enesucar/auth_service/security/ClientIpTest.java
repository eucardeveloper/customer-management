package com.enesucar.auth_service.security;

import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class ClientIpTest {

    @Test
    void withoutTheHeaderTheSocketAddressIsUsed() {
        assertThat(ClientIp.resolve(null, "10.0.0.5")).isEqualTo("10.0.0.5");
        assertThat(ClientIp.resolve("  ", "10.0.0.5")).isEqualTo("10.0.0.5");
    }

    @Test
    void theRightMostPublicAddressWins_soAForgedLeftEntryDoesNotCount() {
        // client forged "1.1.1.1"; our gateway appended the real client 203.0.113.9 and a proxy 172.18.0.4
        assertThat(ClientIp.resolve("1.1.1.1, 203.0.113.9, 172.18.0.4", "172.18.0.2")).isEqualTo("203.0.113.9");
    }

    @Test
    void whenEverythingIsPrivateTheRightMostEntryIsUsed() {
        assertThat(ClientIp.resolve("192.168.1.7, 172.18.0.4", "172.18.0.2")).isEqualTo("172.18.0.4");
    }

    @Test
    void ipv6UniqueLocalCountsAsPrivate() {
        assertThat(ClientIp.resolve("2001:db8::1, fd12:3456::9", "fd12:3456::2")).isEqualTo("2001:db8::1");
    }

    @Test
    void garbageEntriesAreIgnoredAndNeverResolvedAsHostnames() {
        assertThat(ClientIp.resolve("evil.example.com, not an ip", "10.1.1.1")).isEqualTo("10.1.1.1");
        assertThat(ClientIp.resolve("evil.example.com, 198.51.100.7", "10.1.1.1")).isEqualTo("198.51.100.7");
    }
}
