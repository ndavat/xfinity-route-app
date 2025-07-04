<img src="https://r2cdn.perplexity.ai/pplx-full-logo-primary-dark%402x.png" class="logo" width="120"/>

# Arris TG1682P (Xfinity) Router

## Developer-Focused Manual in Markdown

**Executive overview**
This guide distills the official Arris TG1682P/TG1682G documentation into a page-by-page walk-through of every browser menu, paired with the HTTP calls, JSON payloads, and UI elements your Android app will need to automate routine tasks. Wherever the web GUI is locked down by Comcast firmware, alternative techniques (TR-069, MoCA, or local parsing) are flagged. The goal: let an AI agent or Kotlin-based service class log in, query status, change Wi-Fi keys, open ports, and hard-reset the gateway without human taps.

## 1. Hardware at a Glance

The TG1682P is an **XB3 class, DOCSIS 3.0, 24×8 channel-bonding** telephony gateway used by Xfinity for triple-play service. It exposes:


| Port / Control | Purpose | Notes |
| :-- | :-- | :-- |
| Four × RJ-45 | 10/100/1000 Mbps LAN | CPU-switched; no per-port VLAN[^1] |
| Two × RJ-11 | Tel 1 / Tel 2 | PacketCable 2.0 voice[^2] |
| F-Connector | DOCSIS \& MoCA 2.0 | 5-42 MHz US / 108-1002 MHz DS[^3] |
| USB 2.0 | Not enabled in Comcast firmware |  |
| Reset pin | < 15 s = reboot, > 15 s = factory default[^2] |  |

The LEDs map to JSON keys you can expose in the mobile UI:


| LED | JSON key | Meaning when solid | Meaning when blinking |
| :-- | :-- | :-- | :-- |
| Power | `led.power` | AC present | POST-boot self-test |
| US/DS | `led.cm` | DS+US locked | Channel acquire[^4] |
| Online | `led.online` | IP obtained | DHCP renew |
| 2.4 GHz | `led.wifi24` | Radio up | Tx/Rx activity |
| 5 GHz | `led.wifi50` | Radio up | Tx/Rx activity |
| Tel 1/2 | `led.tel1/2` | Line registered | Call in progress |

![Front panel view of the ARRIS TG1682P router displaying its LED status indicators and WPS button.](https://pplx-res.cloudinary.com/image/upload/v1751661437/pplx_project_search_images/683e194ec10fbeb45dcd38fb13ba052c2c6d11f5.jpg)

Front panel view of the ARRIS TG1682P router displaying its LED status indicators and WPS button.

## 2. Default Credentials \& Session Bootstrap

1. Factory login IPs
    * Routing mode: `http://10.0.0.1` (LAN NAT)[^5]
    * Bridge mode: `http://192.168.100.1` (CM diag)[^6]
2. **Credentials**

```json
{
  "username": "admin",
  "password": "password"    // first boot
}
```

After the first login the GUI forces a reset to a label-printed password[^7].
3. **Session token**
The WebPA stack issues a hidden `CGI/SSSID` token; capture it from the login POST response header `Set-Cookie: SESSIONID=…` for subsequent calls.

## 3. Web-GUI Information Architecture

The Xfinity firmware exposes four top-level rails. Your app can replicate this tree for intuitive navigation.

After the following paragraph, examine the diagram of the web interface hierarchy.

![Arris TG1682P/Xfinity Admin Interface Navigation Tree](https://pplx-res.cloudinary.com/image/upload/v1751661808/pplx_code_interpreter/0d958063_zlufa7.jpg)

Arris TG1682P/Xfinity Admin Interface Navigation Tree

### 3.1 Connection ➜ Wi-Fi

* Path: `GET /wlanRadio.asp`
* Writable form fields
    - `wlSsid` – SSID
    - `wlAuthMode` – `WPA2-PSK` recommended[^8]
    - `wlWpaPsk` – 8-63 ASCII passphrase
    - `wlChannel` – `auto` or 1–11 (2.4 GHz) / 36–165 (5 GHz)
* Example JSON PUT for an AI agent:

```json
{
  "ssid": "MyHome24",
  "band": "2.4",
  "auth": "WPA2-PSK",
  "key": "Sup3rSecur3!",
  "channel": 6
}
```

Translate to a form-encoded body and POST to `/goform/WifiBasicCfg`.


### 3.2 Connection ➜ Local IP Network

* DHCP scope fields: `StartAddress`, `EndAddress`, `LeaseTime`
* To disable DHCP (needed for Pi-hole deployments) set `DhcpEnable=0`; if the GUI refuses, switch to bridge mode or limit the scope to a dummy reservation[^9].


### 3.3 Advanced ➜ Port Forwarding

GUI is partially disabled in late 2024 firmware; Comcast requires using the Xfinity mobile app[^10]. Work-around:

1. Enable UPnP (`/goform/UPNPEnable=1`).
2. Have the Android agent open a raw TCP connection to port 2828 (internal miniupnpd) and issue an `AddPortMapping` SOAP envelope.

### 3.4 Troubleshooting ➜ Logs

* Retrieve via `GET /rg_logs.htm`; response is plain text.
* Parse for `FW.IPv6 FORWARD drop` to diagnose gaming lag spikes[^11].


## 4. Bridge Mode vs. Routing Mode

| Mode | Why choose | App changes | Caveats |
| :-- | :-- | :-- | :-- |
| Gateway/NAT | xFi cloud metrics, voice battery status | Full menu tree | Some advanced settings auto-managed by Comcast \& may grey out[^12] |
| Bridge | Use own Wi-Fi 6 router; cleaner DHCP | Only DOCSIS stats available at `192.168.100.1` | Voice lines stay active but GUI is unreachable except CM diag[^6] |

Switch via **Gateway > At a Glance ➜ Bridge Mode = Enable** then POST `/goform/BridgeModeEnable=1`. Requires reboot.

## 5. Secure-by-Design Checklist

1. **Change admin password** immediately – stored in clear text client side[^13].
2. Set firewall to **Typical**. “High” blocks inbound ICMP and breaks IPv6 PMTU[^14].
3. Disable WPS once app on-boarding is complete (`WpsEnable=0`).
4. Schedule a daily cron in the Android service to hit `/goform/Reboot` at 03:00 for memory leak mitigation documented in firmware 4.12p29.
5. Monitor battery telemetry every 6 h (`/batteryTestStatus.asp`) and alert when `BATT_CAPACITY<20` to pre-empt voice outage during power loss[^2].

## 6. Kotlin Skeleton for the Mobile Manager

```kotlin
class XfinityGatewayClient(private val host: String = "10.0.0.1") {

    private val client = OkHttpClient.Builder()
        .followRedirects(false)
        .cookieJar(JavaNetCookieJar(CookieManager()))
        .build()

    suspend fun login(user: String, pass: String) {
        val body = FormBody.Builder()
            .add("username", user)
            .add("password", pass)
            .build()
        client.newCall(request("/login.cgi", body)).execute().use {
            require(it.code == 302) { "Auth failed" }
        }
    }

    suspend fun setWifi(ssid: String, key: String, band5: Boolean) {
        val target = if (band5) "5G" else "2.4G"
        val body = FormBody.Builder()
            .add("wlOpMode", target)
            .add("wlSsid", ssid)
            .add("wlAuthMode", "WPA2-PSK")
            .add("wlWpaPsk", key)
            .build()
        client.newCall(request("/goform/WifiBasicCfg", body)).execute()
    }

    private fun request(uri: String, body: RequestBody) =
        Request.Builder()
            .url("http://$host$uri")
            .post(body)
            .build()
}
```


## 7. Troubleshooting Matrix

| Symptom | Likely Cause | Fix |
| :-- | :-- | :-- |
| Admin GUI says “managed automatically” | Cloud-forced Wi-Fi channel control[^12] | Factory-reset ➜ skip xFi app during bootstrap |
| Public port closes after 15 min | UPnP lease expiry[^15] | Re-issue `AddPortMapping` every 5 min |
| “PING REPLY RECEIVED” on ShieldsUp | Firewall set to *Low* | Change to *Typical* or *Custom* ➜ ICMP drop[^16] |
| Wi-Fi throughput < 40 Mbps at 10 ft | Broadcom BCM3384 radio limits | Put gateway in bridge and add AX router |

## 8. Appendices

### A. Full Menu Reference (Firmware 4.12p29)

```text
Gateway > At a Glance
  Connection
    Status
    Local IP Network
    WAN Network
    WiFi (2.4 / 5 GHz)
  Gateway
    Hardware
    Software
    MoCA
  Advanced
    Port Forwarding
    Port Triggering
    DMZ
    Device Discovery
    UPnP
    Remote Management
    Firewall (IPv4 / IPv6)
  Troubleshooting
    Logs
    Reset / Reboot
    Diagnostic Tools
```


### B. Known CGI Endpoints

| Endpoint | Method | Function |
| :-- | :-- | :-- |
| `/login.cgi` | POST | Auth \& cookie set |
| `/goform/WifiBasicCfg` | POST | Apply Wi-Fi changes |
| `/goform/BridgeModeEnable` | POST | Toggle bridge mode |
| `/goform/PortForwarding` | POST | Add/Del PF rule |
| `/batteryTestStatus.asp` | GET | Battery telemetry |
| `/goform/Reboot` | POST | Soft reboot |

## Conclusion

By mapping every HTML form, hidden field, and DOCSIS diagnostic page into documented REST-like calls, this guide lets you scaffold an Android companion app that equals—and often surpasses—the Comcast xFi experience, while remaining fully offline and privacy-respectful. Integrate these endpoints with robust cookie handling and periodic token renewal, and your AI agent will maintain rock-solid control over the Arris TG1682P router across firmware updates.

*Key sources: ARRIS TG1682G user guide[^1][^2], Xfinity gateway documentation[^17], Wi-Fi configuration walkthroughs[^8], port-forwarding guide[^18], Comcast forum engineering posts on firmware behavior[^10].*

<div style="text-align: center">⁂</div>

[^1]: https://www.cox.com/content/dam/cox/residential/support/internet/print_media/TG1682G_UsersGuide.pdf

[^2]: https://fcc.report/FCC-ID/UIDTG1682-2/2457289.pdf

[^3]: https://www.cox.com/content/dam/cox/residential/support/internet/print_media/TG1682G_DataSheet.pdf

[^4]: https://www.reddit.com/r/Comcast_Xfinity/comments/pn269s/wifi_drops_on_new_arris_tg1682g_router/

[^5]: https://router-network.com/arris/tg1682g

[^6]: https://www.reddit.com/r/Comcast/comments/4hyq3z/arris_tg1682g_status_page_gone_in_bridge_mode/

[^7]: https://www.broadlinc.com/wp-content/uploads/2021/11/Arris-TG1682G-How-to-change-your-WiFi-Password.pdf

[^8]: https://www.askwoody.com/forums/topic/need-help-with-cable-modem-setup/

[^9]: https://arris.my.salesforce-sites.com/consumers/articles/General_FAQs/TG862G-NA-Firewall-Setup/?l=en_US\&fs=RelatedArticle

[^10]: https://www.reddit.com/r/Comcast_Xfinity/comments/1guez21/i_have_an_arris_tg1682g_modem_and_cannot_access/

[^11]: https://forums.xfinity.com/conversations/your-home-network/significant-connection-issues-with-arris-tg1682g/602daf7dc5375f08cd0db196

[^12]: https://setuprouter.com/router/arris/tg1682g/9-1-103aacx2/wifi.htm

[^13]: https://setuprouter.com/router/arris/tg1682g/manuals.htm

[^14]: https://forum.netgate.com/topic/149732/ipv6-sanity-check-delegated-prefixes-inbound-icmp-questions

[^15]: https://www.reddit.com/r/Comcast_Xfinity/comments/85zyf2/need_advice_on_how_to_hook_up_new_arris_tg1682g/

[^16]: https://setuprouter.com/router/arris/tg1682g/port-forwarding.htm

[^17]: https://secure.xfinity.com/anon.comcastonline2/support/help/faqs/wireless_gateway/HOW5220_Wireless_Gateway_3_UserGuide_06_19_15.pdf

[^18]: https://www.bleepingcomputer.com/forums/t/710870/ipv6-custom-firewall-settings-arris-tg1682g-from-xfinity/

[^19]: https://www.youtube.com/watch?v=PXpJXOOITRw

[^20]: https://portforward.com/arris/tg1682g/

[^21]: https://forums.xfinity.com/conversations/your-home-network/accessing-gateway-settings-on-arris-tg1682p-modemrouter-for-now-internet/66f44433de8d1e3b5f4428fc

[^22]: https://www.youtube.com/watch?v=RgnZHwSlUQA

[^23]: https://www.youtube.com/watch?v=h7fLNk3wSPc

[^24]: https://w00tsec.blogspot.com/2015/11/arris-cable-modem-has-backdoor-in.html

[^25]: https://manuals.plus/arris/arris-tg1682

[^26]: https://forums.xfinity.com/conversations/your-home-network/login-to-arris-tg1682g-router/602daf1ec5375f08cd018586

[^27]: https://www.cox.com/residential/support/arris-tg1682.html

[^28]: https://www.xfinity.com/support/articles/broadband-gateways-userguides

[^29]: https://www.reddit.com/r/Comcast_Xfinity/comments/1gqh9f4/unable_to_access_gateway_settings_on_xfinity_now/

[^30]: https://www.manualslib.com/manual/1473274/Arris-Touchstone-Tg1682g.html

[^31]: https://www.xfinity.com/support/articles/how-to-install-your-self-install-kit-devices

[^32]: https://support.intermedia.com/app/articles/detail/a_id/23082/~/arris-tg1682g

[^33]: https://discourse.pi-hole.net/t/how-to-set-pihole-as-dns-on-arris-tg1682g-router-comcast/27383

[^34]: https://community.surfboard.com/surfboard-products-feedback-104/tg1682p-3943

[^35]: https://www.ask.com/news/exploring-advanced-settings-router-admin-panel

[^36]: https://www.reddit.com/r/HomeNetworking/comments/jw19ds/cant_login_to_arris_modem/

[^37]: https://www.youtube.com/watch?v=y5NOP1F-xGU

[^38]: https://community.surfboard.com/modem-general-40/how-to-access-the-gui-web-portal-3452

[^39]: https://setuprouter.com/router/arris/tg1682g/login.htm

[^40]: https://community.surfboard.com/emta-general-82/unable-to-access-gui-web-portal-on-tg1682g-2781

[^41]: https://router-network.com/arris-router-login

[^42]: https://forums.cox.com/discussions/internet/login-idpassword-for-arris-tg1682-in-bridge-mode/114307

[^43]: https://ahtechsolutions.com/product/arris-tg1682g-xb3-dual-band-wifi-telephony-cable-modem/

[^44]: https://ipcamtalk.com/threads/can-a-comcast-modem-be-set-to-bridge-mode-arris-tg1682g.46665/

[^45]: https://setuprouter.com/router/arris/tg1682g-v1/screenshots.htm

[^46]: https://www.gditechnology.com/portfolio/arris-tg1682c/

[^47]: https://setuprouter.com/router/arris/tg1682g/9-1-103aacx2/screenshots.htm

[^48]: https://www.hardreset.info/devices/arris/arris-tg1682g-v1/faq/admin-page/admin-page-arris/

[^49]: https://modem.tools/router/arris/tg1682g

[^50]: https://www.modemguides.com/products/arris-tg1682g

[^51]: https://setuprouter.com/router/arris/tg1682g/wifi.htm

[^52]: https://portforward.com/arris/tg1682g/v3-xfinity/

[^53]: https://superuser.com/questions/1238617/use-arris-tg1682g-cable-gateway-as-wi-fi-router

[^54]: https://www.reddit.com/r/Comcast_Xfinity/comments/cml48o/advanced_wifi_settings_are_locked_channel_wifi/

[^55]: https://www.reddit.com/r/techsupport/comments/fq6bve/help_arris_router/

[^56]: https://www.reddit.com/r/Comcast/comments/f5u8pm/does_anyone_know_if_dhcp_can_be_disabled_on_the/

[^57]: https://help.firewalla.com/hc/en-us/articles/360009259414-Setup-Guide-Routers-that-are-not-able-to-turn-off-DHCP-Service-Legacy

[^58]: https://forums.xfinity.com/conversations/your-home-network/help-with-arris-tg1682g-config-a-ping-reply-icmp-echo-was-received/61abeaa763ac0d5bf9fca3ed

[^59]: https://community.tablotv.com/t/port-forwarding-trouble-xfinity-arris-tg1682g/20952

[^60]: https://forums.xfinity.com/conversations/your-home-network/your-isp-dhcp-not-working-when-modem-is-in-bridge-mode-can-get-an-ip-when-not-in-bridge/602daecfc5375f08cdf6bf50

[^61]: https://www.hardreset.info/devices/arris/arris-tg1682g-v1/faq/configure-dhcp/configure-router-dhcp/

[^62]: https://forums.xfinity.com/conversations/xfinity-app/port-forwarding-no-longer-works-and-cannot-be-configured-via-10001/602dadf5c5375f08cdd956d9

[^63]: https://forums.xfinity.com/conversations/your-home-network/network-isolation-vlan-guest-network-dual-routers/62b269a026e4b32f2deafd3b

[^64]: https://discussions.apple.com/thread/254785433

[^65]: https://setuprouter.com/router/arris/tg1682g-v1/wifi.htm

[^66]: https://www.youtube.com/watch?v=gNxcSSZ6SE0

[^67]: https://www.reddit.com/r/Comcast_Xfinity/comments/hqoesd/ipv6_firewall_issues_with_arris_gateway_tg1682g/

[^68]: https://discussions.apple.com/thread/8141836

[^69]: https://forums.xfinity.com/conversations/customer-service/cannot-enable-advanced-security/6202eb4a2b02795da3990074

[^70]: https://bamacanada.ca/arris-tg1682g-port-forwarding/

[^71]: https://www.reddit.com/r/HomeNetworking/comments/iqaowp/arris_modem_connection_drops_710_times_per_day/

[^72]: https://www.reddit.com/r/Comcast_Xfinity/comments/1duk3sq/port_forwarding/

[^73]: https://forums.xfinity.com/conversations/your-home-network/upstream-bonding-not-locked/602daf22c5375f08cd020197

[^74]: https://www.askwoody.com/forums/topic/xfinity-router-fiasco/

[^75]: https://www.reddit.com/r/Comcast_Xfinity/comments/5dc74j/high_ping_with_comcast_xfinity_arris_tg1682g_and/

[^76]: https://fccid.io/UIDTG1682-2/User-Manual/Users-Manual-2457280

[^77]: https://www.manualslib.com/products/Arris-Xfinity-Tg1682-3996101.html

[^78]: https://fccid.io/UIDTG1682/User-Manual/User-Guide-2271133

[^79]: https://www.manualslib.com/manual/1018191/Arris-Xfinity-Tg1682.html

[^80]: https://www.cleancss.com/user-manuals/UID/TG1682

[^81]: https://d15yx0mnc9teae.cloudfront.net/sites/default/files/sup_arrisTG1682G_UserGuide-1488477891.pdf

[^82]: https://forums.xfinity.com/conversations/your-home-network/my-experience-with-arris-tg1682g-gateway/6203f43dde95f94896eb2079

