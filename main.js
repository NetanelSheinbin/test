window.wz = window.wz || {};
wz.config = wz.config || {};
wz.loadMgr = wz.loadMgr || {};
wz.loggerMgr = wz.loggerMgr || {};
wz.cmd = wz.cmd || [];
wz.pixelMgr = wz.pixelMgr || {};
wz.pbMgr = wz.pbMgr || {};
wz.tagMgr = wz.tagMgr || {};
wz.layoutMgr = wz.layoutMgr || {};
wz.utils = wz.utils || {};
wz.lazyMgr = wz.lazyMgr || {};

window.debugInfo = {};

wz.loadMgr.version = 's100';
wz.loadMgr.build = '1';
wz.loadMgr.buildVersion = wz.loadMgr.version + '.' + wz.loadMgr.build;

wz.loggerMgr.trackingUrlBulk = '//bqstreamer.com/tr/';
wz.loggerMgr.bulkTracking = true;
wz.loggerMgr.eventQueue = [];
wz.loggerMgr.runEverySecond = [];

wz.layoutMgr.pageNumWatermark = 0;
wz.layoutMgr.adslotWordGap = wz.config.template.adslotWordGap || ((wz.config.template.device === 'desktop') ? 600 : 140);
wz.layoutMgr.recommendationsSlotEvery = wz.config.template.recommendationsSlotEvery || false;
wz.layoutMgr.lastTimeStickyRefreshed = new Date().getTime() / 1000;
wz.layoutMgr.deletedSlots = [];
wz.layoutMgr.stickyLoaded = false;
wz.layoutMgr.rightStickyLoaded = false;
wz.layoutMgr.mobileRecommendationsTagIdx = 1;

wz.tagMgr.smartFeedLoaded = false;
wz.tagMgr.openWebWidgetCounter = 0;

var googletag = googletag || {};
googletag.cmd = googletag.cmd || [];

var pbjs = pbjs || {};
pbjs.que = pbjs.que || [];
wz.pbMgr.isPrebidInited = false;
wz.pbMgr.userIdsArray = [];
wz.pbMgr.deletedSlots = [];
wz.pbMgr.lazyViewportExpand = wz.config.template.lazyLoadExpand ? wz.config.template.lazyLoadExpand : (wz.config.template.device === 'phone') ? 500 : 2000;
wz.pbMgr.dfpObjectIndex = {};
wz.pbMgr.pbObjectIndex = {};
wz.pbMgr.a9amznbid = {};
wz.pbMgr.duplicateAdSlotUx = 5000;
wz.pbMgr.adserverRequestSent = {};
wz.pbMgr.pendingAuctions = {};
wz.pbMgr.totalRequestsSent = 0;
wz.pbMgr.auctionProp = {};
wz.pbMgr.bidsMonitorCount = {};

wz.lazyMgr.lazyloadListenerRunning = false;
wz.lazyMgr.lazyloadCallbacks = [];
wz.lazyMgr.lazyloadDirtyFlag = false;
wz.lazyMgr.lazyloadHandlerBusy = false;

wz.loadMgr.critical = function (error) {
    window.debugInfo.url = document.location.href;

    let data = {
        "application": "WzMgr",
        "module": "WzMgr",
        "target": "requests",
        "version": wz.loadMgr.buildVersion,
        "type": "error",
        "event": "error",
        "domain": window.location.hostname,
        "variation": 'LoadMgr',
        "details": JSON.stringify(window.debugInfo),
        "c1": JSON.stringify(wz.config),
        "errors": error
    };

    navigator.sendBeacon(wz.loggerMgr.trackingUrlBulk, JSON.stringify({events: [data]}));
    console.log('wz.loadMgr.critical', data);
};

wz.loadMgr.initVars = function () {
    try {
        const parsedURL = new URL(document.location.href)
        wz.loadMgr.queryParams = parsedURL.searchParams;

        wz.loadMgr.server = wz.loadMgr.contentServer = (window.location.hostname.indexOf("test.") === 0) ? '//test.admin.wazimo.com' : '//content.wazimo.com';
        wz.loadMgr.domain = window.location.hostname.replace('test.', 'www.');

        wz.loadMgr.cookieSet('_layout', wz.config.trackingChannel.variation, 30);
        wz.loadMgr.cookieSet('_flow', wz.config.trackingChannel.flow, 30);
        wz.loadMgr.cookieSet('_guid', wz.config.trackingChannel.guid, 30);

        wz.loadMgr.loadExtraFiles();
    } catch (e) {
        wz.loadMgr.critical(e.message);
    }
};

wz.loadMgr.cookieGet = function (name) {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
        const cookie = cookies[i].trim();
        if (cookie.startsWith(`${name}=`)) {
            return decodeURIComponent(cookie.substring(name.length + 1));
        }
    }
    return null;
};

wz.loadMgr.cookieSet = function (name, value) {
    let cookieString = `${encodeURIComponent(name)}=${encodeURIComponent(value)}`;
    const currentDate = new Date();
    currentDate.setTime(currentDate.getTime() + 30 * 60 * 1000);
    cookieString += `; expires=${currentDate.toUTCString()}`;

    document.cookie = cookieString + '; path=/';
};

wz.loadMgr.isPaidSession = function () {
    if (!wz.loadMgr.queryParams.get('utm_campaign') || wz.loadMgr.queryParams.get('utm_campaign').trim().length === 0) {
        return false;
    }

    const campaign = wz.loadMgr.queryParams.get('utm_campaign').trim();
    if (wz.loadMgr.cookieGet('_wzc.session') && wz.loadMgr.cookieGet('_wzc.session').length > 0 && wz.loadMgr.cookieGet('_wzc.session') === campaign) {
        return false;
    }

    wz.loadMgr.cookieSet('_wzc.session', campaign);
    return true;
};

wz.loadMgr.loadExtraFiles = function () {
    $.getJSON("https://cdn.wazimo.com/engine/static/li_direct_list.json?static=true", function (data) {
        wz.loadMgr.lineItemsData = data;
    });

    $.getJSON("https://cdn.wazimo.com/engine/static/a9_r.json?static=true", function (data) {
        wz.loadMgr.a9_data = data;
    });
};

wz.loadMgr.initIntentIQObject = function () {
    try {
        wz.pbMgr.intentIq = new IntentIqObject({
            partner: 691779092,
            pbjs: pbjs,
            callback: wz.pbMgr.init,
            timeoutInMillis: 500,
            ABTestingConfigurationSource: 'percentage',
            abPercentage: 95,
            manualWinReportEnabled: true
        });
    } catch (e) {
        wz.loadMgr.critical(e.message);
    }
};

wz.loadMgr.loadIntentIQ = function () {
    if (wz.config.template.loadIntentIQ) {
        $.getScript('https://content.wazimo.com/engine/common/js/IIQUniversalID.js', wz.loadMgr.initIntentIQObject);
    }
};

// Start Logger
wz.loadMgr.initLogger = function () {
    try {
        wz.config.trackingChannel.version = wz.loadMgr.buildVersion;
        wz.config.trackingChannel.resolution = window.screen.width + 'x' + window.screen.height;
        wz.config.trackingChannel.flow = wz.article ? wz.article.version : null;

        if (wz.config.template.comments) {
            wz.config.trackingChannel.experiment += ':' + wz.config.template.comments;
        }

        wz.loggerMgr.runEverySecond.push(wz.loggerMgr.flushEventQueue);

        const queuedCommands = wz.cmd || [];
        wz.cmd = {
            push: function (callback) {
                callback()
            }
        };

        queuedCommands.forEach(function (callback) {
            try {
                callback();
            } catch (e) {
                wz.loggerMgr.error('wz.cmd: ' + e.message);
            }
        });
    } catch (e) {
        wz.loadMgr.critical(e.message);
    }
};

wz.loggerMgr.track = function (type, event, additionalData) {
    try {
        const data = {type: type, event: event, timing: wz.initTime ? new Date().getTime() - wz.initTime : null};
        $.extend(data, wz.config.trackingChannel);
        $.extend(data, additionalData);

        wz.loggerMgr.log('TrackingEvent', data.event);

        if (wz.loggerMgr.bulkTracking) {
            wz.loggerMgr.eventQueue.push(data);
            if (wz.loggerMgr.eventQueue.length >= 10) {
                wz.loggerMgr.flushEventQueue();
            }
        } else {
            navigator.sendBeacon(wz.loggerMgr.trackingUrlBulk, JSON.stringify({events: [data]}));
        }

        if (data.event === 'videoAd') {
            wz.pixelMgr.triggerVideoAds(data.network);
        }
    } catch (e) {
        wz.loadMgr.critical(e.message);
    }
};

// runEverySecond usage: wz.loggerMgr.runEverySecond.push(function(){...})
wz.loggerMgr.runEverySecondHandler = function () {
    wz.loggerMgr.runEverySecond.forEach(function (callback) {
        try {
            callback();
        } catch (e) {
            wz.loggerMgr.error('runEverySecond:' + e.message);
        }
    });
    setTimeout(wz.loggerMgr.runEverySecondHandler, 1000);
};
setTimeout(wz.loggerMgr.runEverySecondHandler, 1000);

wz.loggerMgr.flushEventQueue = function () {
    try {
        if (!wz.loggerMgr.eventQueue.length) {
            return;
        }

        const events = [];
        while (wz.loggerMgr.eventQueue.length) {
            events.push(wz.loggerMgr.eventQueue.shift());
        }

        wz.loggerMgr.log('Flush Events', events.length);
        navigator.sendBeacon(wz.loggerMgr.trackingUrlBulk, JSON.stringify({events: events}));
    } catch (e) {
        wz.loadMgr.critical(e.message);
    }
};

wz.loggerMgr.log = function (p1, p2, p3, p4, p5, p6) {
    if (wz.config.template.debug) {
        console.log('wz ', p1, p2 || '', p3 || '', p4 || '', p5 || '', p6 || '');
    }
};

wz.loggerMgr.error = function (msg) {
    wz.loggerMgr.log('Wz ERROR: ' + msg);
    if (wz.config.template.debug) {
        alert(msg);
    }

    wz.loggerMgr.track('error', 'error', {errors: msg});
};
// END Logger

// Start MMTagManager
wz.tagMgr.loadGDPRScript = function () {
    try {
        if (!wz.config.template.isGDPR) {
            return;
        }

        if (wz.config.template.skipDidomi) {
            return;
        }

        wz.config.template.didomiLoadsGpt = true;
        window.gdprAppliesGlobally = true;

        (function () {
            function a(e) {
                if (!window.frames[e]) {
                    if (document.body && document.body.firstChild) {
                        var t = document.body;
                        var n = document.createElement("iframe");
                        n.style.display = "none";
                        n.name = e;
                        n.title = e;
                        t.insertBefore(n, t.firstChild)
                    } else {
                        setTimeout(function () {
                            a(e)
                        }, 5)
                    }
                }
            }

            function e(n, r, o, c, s) {
                function e(e, t, n, a) {
                    if (typeof n !== "function") {
                        return
                    }
                    if (!window[r]) {
                        window[r] = []
                    }
                    var i = false;
                    if (s) {
                        i = s(e, t, n)
                    }
                    if (!i) {
                        window[r].push({command: e, parameter: t, callback: n, version: a})
                    }
                }

                e.stub = true;

                function t(a) {
                    if (!window[n] || window[n].stub !== true) {
                        return
                    }
                    if (!a.data) {
                        return
                    }
                    var i = typeof a.data === "string";
                    var e;
                    try {
                        e = i ? JSON.parse(a.data) : a.data
                    } catch (t) {
                        return
                    }
                    if (e[o]) {
                        var r = e[o];
                        window[n](r.command, r.parameter, function (e, t) {
                            var n = {};
                            n[c] = {returnValue: e, success: t, callId: r.callId};
                            a.source.postMessage(i ? JSON.stringify(n) : n, "*")
                        }, r.version)
                    }
                }

                if (typeof window[n] !== "function") {
                    window[n] = e;
                    if (window.addEventListener) {
                        window.addEventListener("message", t, false)
                    } else {
                        window.attachEvent("onmessage", t)
                    }
                }
            }

            e("__tcfapi", "__tcfapiBuffer", "__tcfapiCall", "__tcfapiReturn");
            a("__tcfapiLocator");
            (function (e) {
                var t = document.createElement("script");
                t.id = "spcloader";
                t.type = "text/javascript";
                t.async = true;
                t.src = "https://sdk.privacy-center.org/" + e + "/loader.js?target=" + document.location.hostname;
                t.charset = "utf-8";
                var n = document.getElementsByTagName("script")[0];
                n.parentNode.insertBefore(t, n)
            })("3810dd55-0181-4ddc-952e-59a8c9a36fe4")
        })();
    } catch (e) {
        wz.loggerMgr.error('loadGDPRScript: ' + e.message);
    }
};

wz.tagMgr.loadCCPAScript = function () {
    try {
        if (wz.config.template.isGDPR) {
            return;
        }

        if (wz.config.template.skipDidomi) {
            return;
        }

        wz.config.template.didomiLoadsGpt = true;
        window.didomiConfig = {
            notice: {
                enable: false
            },
            regulations: {
                ccpa: {
                    enabled: true,
                }
            }
        };

        (function () {
            function i(e) {
                if (!window.frames[e]) {
                    if (document.body && document.body.firstChild) {
                        var t = document.body;
                        var n = document.createElement("iframe");
                        n.style.display = "none";
                        n.name = e;
                        n.title = e;
                        t.insertBefore(n, t.firstChild)
                    } else {
                        setTimeout(function () {
                            i(e)
                        }, 5)
                    }
                }
            }

            function e(n, a, r, e, o) {
                function t(e, t, n) {
                    if (typeof n !== "function") {
                        return
                    }
                    if (!window[a]) {
                        window[a] = []
                    }
                    var i = false;
                    if (o) {
                        i = o(e, t, n)
                    }
                    if (!i) {
                        window[a].push({command: e, parameter: t, callback: n})
                    }
                }

                t.stub = true;

                function i(i) {
                    if (!window[n] || window[n].stub !== true) {
                        return
                    }
                    if (!i.data) {
                        return
                    }
                    var a = typeof i.data === "string";
                    var e;
                    try {
                        e = a ? JSON.parse(i.data) : i.data
                    } catch (t) {
                        return
                    }
                    if (e[r]) {
                        var o = e[r];
                        window[n](o.command, o.parameter, function (e, t) {
                            var n = {};
                            n.postMessageReturn = {returnValue: e, success: t, callId: o.callId};
                            i.source.postMessage(a ? JSON.stringify(n) : n, "*")
                        })
                    }
                }

                if (typeof window[n] !== "function") {
                    window[n] = t;
                    if (window.addEventListener) {
                        window.addEventListener("message", i, false)
                    } else {
                        window.attachEvent("onmessage", i)
                    }
                }
            }

            e("__uspapi", "__uspapiBuffer", "__uspapiCall", "__uspapiReturn");
            i("__uspapiLocator");

            (function (e) {
                var t = document.createElement("script");
                t.id = "spcloader";
                t.type = "text/javascript";
                t.async = true;
                t.src = "https://sdk.privacy-center.org/" + e + "/loader.js?target=" + document.location.hostname;
                t.charset = "utf-8";
                var n = document.getElementsByTagName("script")[0];
                n.parentNode.insertBefore(t, n)
            })("3810dd55-0181-4ddc-952e-59a8c9a36fe4")
        })();
    } catch (e) {
        wz.loggerMgr.error('loadCCPAScript:' + e.message);
    }
};

wz.tagMgr.initNative = function () {
    if (!wz.config.template.nativeSettings.provider) {
        return;
    }

    window.OB_extId = '_' + wz.config.trackingChannel.channel + '_' + wz.config.template.pageVariation + '_pmwz';
    window.OB_extSecId = "_" + wz.config.template.utm_medium + '_' + wz.config.trackingChannel.guid;
};

wz.tagMgr.loadAccessibilityWidget = function () {
    if (wz.config.template.showAccessibilityWidget && wz.config.template.accessibilityWidgetSiteKey) {
        if (wz.config.template.device === 'phone') {
            $('.accessibility-btn').css('display', 'flex');
        } else {
            $('.accessibility-btn').css('display', 'block');
        }


        var accDomains = {"js": "https://cdn.equalweb.com/", "acc": "https://access.equalweb.com/"};
        if (wz.config.template.domain === 'floor8.com' || wz.config.template.domain === 'mentalfloss.com' || wz.config.template.domain === 'dbltap.com' || wz.config.template.domain === '90min.com') {
            accDomains = {"js": "https://aacdn.nagich.com/", "acc": "https://access.nagich.com/"};
        }

        window.interdeal = {
            "sitekey": wz.config.template.accessibilityWidgetSiteKey,
            "Menulang": "EN",
            "domains": accDomains
        };

        (function (doc, head, body) {
            var coreCall = doc.createElement('script');
            coreCall.src = 'https://cdn.equalweb.com/core/4.0.4/accessibility.js';
            coreCall.defer = true;
            coreCall.integrity = 'sha512-LDvqiv8qYdF1MIqxiGZrvcDsmN6cZy0u0l23Dj7TVXmkVSNyzjtkcll8uCb8EGdwDVHjvisVYsAWuwTf6Mpu8g==';
            coreCall.crossOrigin = 'anonymous';
            coreCall.setAttribute('data-cfasync', true);
            body ? body.appendChild(coreCall) : head.appendChild(coreCall);
        })(document, document.head, document.body);
    }
};

wz.tagMgr.loadVidazooHBScript = function () {
    if (!wz.config.template.vidazooWidgetId) {
        return;
    }

    var x = document.createElement("script");
    x.type = 'text/javascript';
    x.defer = true;
    x.setAttribute('data-widget-id', wz.config.template.vidazooWidgetId);
    x.src = '//static.vidazoo.com/basev/vwpt.js';
    document.body.appendChild(x);
};

wz.tagMgr.loadStickyScript = function (height = 50) {
    $.getScript('//cdn.wazimo.com/engine/common/js/jquery.sticky.js', function () {
        var footerBottomAdjust = $('.footer').height() + height;
        $(".sticky_ad").sticky({
            topSpacing: 20,
            bottomSpacing: footerBottomAdjust
        });
    });
}

wz.tagMgr.loadVideo = function () {
    if (wz.config.template.wzna) return;

    wz.loggerMgr.log('loadVideo', wz.config.template.videoSettings.provider);
    wz.loggerMgr.track('stats', 'videoRequested', {network: wz.config.template.videoSettings.provider || null});

    switch (wz.config.template.videoSettings.provider) {
        case 'minuteMedia':
        case 'minutemedia':
            if (wz.config.template.loadMMHB) {
                $.getScript('https://cdn.wazimo.com/engine/common/js/minuteMediaHB.js');
                setTimeout(function () {
                    wz.tagMgr.loadMMVideo();
                }, 5000);
            } else {
                wz.tagMgr.loadMMVideo();
            }

            break;
        case 'primis':
            wz.tagMgr.loadPrimisVideo();
            break;
        case 'avantis':
            wz.tagMgr.loadAvantisVideo();
            break;
        case 'Unruly':
        case 'unruly':
            wz.tagMgr.loadUnrulyVideo();
            break;
        case 'selectMedia':
            wz.tagMgr.loadSelectMediaVideo();
            break;
        case 'rise':
            wz.tagMgr.loadRiseVideo();
            break;
        case 'vidazoo':
            wz.tagMgr.loadVidazooVideo();
            break;
        case 'aniview':
            wz.tagMgr.loadAniviewVideo();
            break;
        default:
            wz.loggerMgr.error('videoSettings: Undefined Provider, ' + wz.config.template.videoSettings.provider);
            break;
    }
};

wz.tagMgr.loadMMVideo = function () {
    $.getScript("https://players.voltaxservices.io/players/2/code");

    try {
        if (window.voltax) {
            var mmVPlayers = window.voltax.getAllPlayersOnPage();
            var mmVPlayer = mmVPlayers[0];

            mmVPlayer.on('adImpressionReports', function (params) {
                var ad = params.ad;
                var bidCpm = ad.bidCpm;
                var adUnit = new URL(params.tag).searchParams.get("iu");

                if (isNaN(bidCpm)) {
                    bidCpm = 0;
                }

                // EVENT TO ANL
                wz.loggerMgr.track('stats', 'adImpressionReportsApiWZ', {
                    application: "wzMMLogger",
                    module: "WzMMLog",
                    target: "requests",
                    network: 'mmvid-' + (ad.bidder || 'none'),
                    account: ad.prebidWinningBidderCode || 'none',
                    cid: adUnit || 'none',
                    c1: ad.lineItemID || 'none',
                    c2: ad.adId || 'none',
                    status: ad.demandOwner || 'none',
                    banner: ad.creativeId || 'none',
                    details: "playerAlreadyLoaded",
                    revenue: bidCpm / 1000,
                    cpm: bidCpm
                });
            });
        } else {
            window.addEventListener('voltaxPlayerLoaded', () => {
                try {
                    var mmVPlayers = window.voltax.getAllPlayersOnPage();
                    var mmVPlayer = mmVPlayers[0];

                    mmVPlayer.on('adImpressionReports', function (params) {
                        var ad = params.ad;
                        var bidCpm = ad.bidCpm;
                        var adUnit = new URL(params.tag).searchParams.get("iu");

                        if (isNaN(bidCpm)) {
                            bidCpm = 0;
                        }

                        wz.loggerMgr.track('stats', 'adImpressionReportsApiWZ', {
                            application: "wzMMLogger",
                            module: "WzMMLog",
                            target: "requests",
                            network: 'mmvid-' + (ad.bidder || 'none'),
                            account: ad.prebidWinningBidderCode || 'none',
                            cid: adUnit || 'none',
                            c1: ad.lineItemID || 'none',
                            c2: ad.adId || 'none',
                            status: ad.demandOwner || 'none',
                            banner: ad.creativeId || 'none',
                            details: "voltaxPlayerLoaded",
                            revenue: bidCpm / 1000,
                            cpm: bidCpm
                        });
                    });
                } catch (e) {
                    wz.loggerMgr.error('loadMMVideo: ' + e.message);
                }
            });
        }
    } catch (e) {
        wz.loggerMgr.error('loadMMVideo: ' + e.message);
    }
};

wz.tagMgr.loadPrimisVideo = function () {
    if (!wz.config.template.primisTagId) {
        wz.loggerMgr.error('EXCEPTION: missing primisTagId OR primisVpContent OR primisTagId(domain)');
        return;
    }

    // register primisPlayer events dvlp
    window.top.addEventListener('primisPlayerInit', function (e) {
        if (e.detail.playerApiId === '123') {
            wz.loggerMgr.log('primisPlayerInit ', e.detail.playerApiId);
            var player = e.detail;
            player.addEventListener('videoStart', function (val) {
                wz.loggerMgr.log('primisPlayer videoStart', val.title);
            });
            player.addEventListener('videoEnd', function () {
                wz.loggerMgr.log('primisPlayer videoEnd');
            });
            player.addEventListener('adStarted', function (val) {
                wz.loggerMgr.track('primisAdStarted', 'videoAd', {
                    network: 'primis',
                    revenue: (val.impValue - val.servingFee) / 1000,
                    cpm: (val.impValue - val.servingFee)
                });
            });
            player.addEventListener('volumeChange', function (val) {
                wz.loggerMgr.log('primisPlayer volumeChange', val);
            });
        }
    });
    var url = "https://live.primis.tech/live/liveView.php?playerApiId=123&s=" + wz.config.template.primisTagId + "&cbuster=" + wz.utils.createUniqId() + "&pubUrl=" + document.location.href + "&subId=" + wz.config.trackingChannel.channel + "+" + wz.config.template.pageVariation;
    $.getScript(url);
};

wz.tagMgr.loadAvantisVideo = function () {
    if (!wz.config.template.videoSettings.avantisTagId) {
        wz.config.template.videoSettings.avantisTagId = 5;
    }

    window["brwCallback"] = function (event, data) {
        if (event === 'impression') {
            wz.loggerMgr.track('stats', 'videoAd', {
                network: 'avantis',
                cpm: data.cpm || 0,
                account: data.demandowner || 'none'
            });
        }
    };

    var x = document.createElement("script");
    x.type = 'text/javascript';
    x.async = true;
    x.id = 'avantisJS';
    x.src = "//cdn.avantisvideo.com/avm/js/video-loader.js?id=9b8e1d92-2b12-4074-a389-66113d385185&tagId=" + wz.config.template.videoSettings.avantisTagId + "&subId=" + wz.config.trackingChannel.channel + "&custom1=" + wz.config.template.pageVariation + "";
    document.body.appendChild(x);
};

wz.tagMgr.loadUnrulyVideo = function () {
    if (!wz.config.template.unrulyTagId) {
        wz.loggerMgr.error('EXCEPTION: missing unrulyTagId.');
        return;
    }

    var x = document.createElement("script");
    x.type = 'text/javascript';
    x.async = true;
    x.id = 'AV' + wz.config.template.unrulyTagId;
    x.src = "https://tg1.unrulyvideo.com/api/adserver/spt?AV_TAGID=" + wz.config.template.unrulyTagId + "&AV_PUBLISHERID=64200d36f38a4cfb03013f58&AV_SUBID=" + wz.config.trackingChannel.channel + "&AV_CDIM1=" + wz.config.template.pageVariation + "";
    document.body.appendChild(x);
};

wz.tagMgr.loadAniviewVideo = function () {
    if (!wz.config.template.aniViewTagId) {
        wz.loggerMgr.error('EXCEPTION: missing aniViewTagId.');
        return;
    }

    var aniViewTagId = wz.config.template.aniViewTagId;
    if (wz.config.template.overrideAniViewTagId) {
        aniViewTagId = wz.config.template.overrideAniViewTagId;
    }

    var x = document.createElement("script");
    x.type = 'text/javascript';
    x.async = true;
    x.id = 'AV' + wz.config.template.aniViewTagId;
    x.src = "https://tg1.aniview.com/api/adserver/spt?AV_TAGID=" + aniViewTagId + "&AV_PUBLISHERID=6177ed2aace410211b26525b&AV_SUBID=" + wz.config.trackingChannel.channel + "&AV_CDIM1=" + wz.config.template.pageVariation + "";
    document.body.appendChild(x);
};

wz.tagMgr.loadSelectMediaVideo = function () {
    var x = document.createElement("script");
    x.type = 'text/javascript';
    x.async = true;
    if (wz.config.template.device === 'desktop') {
        x.id = 'selectJS461234553';
        x.src = "//play.selectmedia.asia/58fcbed1073ef420086c9d08/5f7db9a7107454156e357ff8/wazimo_outstream_desktop.js?AV_CUSTOM1=" + wz.config.trackingChannel.channel + "&AV_CUSTOM2=" + wz.config.template.pageVariation + "";
    } else { // Mobile
        x.id = 'selectJS713168961';
        x.src = "//play.selectmedia.asia/58fcbed1073ef420086c9d08/5f761664fc18833e9d09aae8/wazimo_outstream_mix_new.js?AV_CUSTOM1=" + wz.config.trackingChannel.channel + "&AV_CUSTOM2=" + wz.config.template.pageVariation + "";
    }
    document.body.appendChild(x);
};

wz.tagMgr.loadRiseVideo = function () {
    $.getScript("https://sdk.streamrail.com/wrapper/hb.loader.js?wrapper_id=62c13e179766d400014b1beb&org=6241a075efc76b0001f12777&rate_callback=riseRateCallback", function () {
        window.riseRateCallback = function (rateData) {
            wz.loggerMgr.track('stats', 'videoAd', {network: 'rise', cid: rateData.type, cpm: rateData.rate || 0});
        }
    });
};

wz.tagMgr.loadVidazooVideo = function () {
    if (!wz.config.template.vidazooVideoId) {
        wz.loggerMgr.error('EXCEPTION: missing vidazooVideoId.');
        return;
    }

    window.onVidazooWidgetAdImpressionCallback = function (cpm, info) {
        wz.loggerMgr.track('stats', 'videoAd', {
            network: 'vidazoo',
            cid: info.demandType + "_" + info.bidderCode,
            keyword: info.adType,
            account: info.bidderCode,
            cpm: (info.netCpm - info.adServingFee) || 0
        });
    }

    var x = document.createElement("script");
    x.type = 'text/javascript';
    x.defer = true;
    x.src = "https://static.vidazoo.com/basev/vwpt.js";
    x.setAttribute('data-widget-id', wz.config.template.vidazooVideoId);
    x.setAttribute('data-param1', wz.config.trackingChannel.channel);
    x.setAttribute('data-param2', wz.config.template.pageVariation);
    x.setAttribute('data-on-widget-ad-impression', "onVidazooWidgetAdImpressionCallback");
    document.body.appendChild(x);
};

wz.tagMgr.loadNativeSmartFeed = function (containerId) {
    if (wz.config.template.disableNative) {
        wz.loggerMgr.log('Smartfeed skipped due to disableNative flag');
        return;
    }

    if (wz.tagMgr.smartFeedLoaded) {
        wz.loggerMgr.log('Smartfeed already loaded');
        return;
    }

    wz.tagMgr.smartFeedLoaded = true;

    containerId = containerId || 'container-content-end';
    var $container = $('#' + containerId);

    wz.loggerMgr.log('Loading Outbrain smartfeed:');
    var outbrainWidgetId = (wz.config.template.device === 'desktop') ? wz.config.template.nativeSettings.ob_widget_sf : wz.config.template.nativeSettings.ob_widget_sf_m;
    outbrainWidgetId = wz.config.template.overrideSmartFeedWidgetId || outbrainWidgetId;

    wz.tagMgr.loadOutbrain($container, wz.config.template.nativeSettings.ob_template, outbrainWidgetId);
};

wz.tagMgr.loadOutbrain = function ($container, ob_template, ob_widget) {
    if (!wz.config.trackingChannel.source || wz.config.trackingChannel.browser === 'Netscape' || wz.config.template.wzna) {
        wz.loggerMgr.log('Outbrain - skipped');
        return;
    }

    if (!ob_template || !ob_widget || !$container.length) return;

    var html = '<div class="OUTBRAIN" data-widget-id="' + ob_widget + '" data-ob-template="' + ob_template + '" data-external-id="' + window.OB_extId + '" data-external-secondary-id="' + window.OB_extSecId + '"></div>';

    $container.html(html);

    // load oubrain script once
    if (!window.OBR) {
        $.getScript("//widgets.outbrain.com/outbrain.js");
    } else {
        OBR.extern.researchWidget();
    }

    wz.loggerMgr.log('Loading Outbrain', ob_template, ob_widget);
};

wz.tagMgr.loadSonobiPush = function () {
    try {
        var pushlyOnPage = wz.config.template.pushlyEnableOnPage || 10;

        if (pushlyOnPage === wz.config.template.pageNum) {
            var x = document.createElement("script");
            x.type = 'text/javascript';
            x.src = "https://sbi-push.com/sonobi-library-push.js";
            document.body.appendChild(x);

            x.addEventListener("load", function () {
                var sonobiPushLib = window.sonobiPushLib || {};
                sonobiPushLib.cmd = window.sonobiPushLib.cmd || [];
                sonobiPushLib.cmd.push(function () {
                    var pushInitParams = {
                        accountId: '1040624864139',
                        serviceWorkerPath: '//en.' + wz.config.template.domain + '/assets/sonobi/sonobi-sdk-worker.js',
                        logging: false,
                        domain: wz.config.template.domain
                    };
                    sonobiPushLib.initializePush(pushInitParams);
                });
            })
        }
    } catch (e) {
        wz.loggerMgr.error('EXCEPTION: wz.tagMgr.loadSonobiPush: ' + e.message);
    }
};

wz.tagMgr.loadRecommendations = function ($e) {
    switch (wz.config.template.nativeSettings.provider) {
        case 'outbrain':
            wz.tagMgr.loadOutbrainRecommendations($e);
            break;
        case 'taboola':
            wz.tagMgr.loadTaboolaRecommendations($e);
            break;
    }
};

wz.tagMgr.loadOutbrainRecommendations = function ($e) {
    var pageNumber = $e.parents('.article-page').data('page-num');

    var outbrainId = wz.config.template.nativeSettings.ob_widget_bc;
    var outbrainSFWidgetId = wz.config.template.nativeSettings.ob_widget_sf;

    if (wz.config.template.device === 'phone') {
        outbrainId = wz.config.template.nativeSettings.ob_widget_m;
        outbrainSFWidgetId = wz.config.template.nativeSettings.ob_widget_sf_m;

        if (wz.config.template.nativeSmartFeedMobile) {
            outbrainId = outbrainSFWidgetId;
        }

        if (wz.config.template.layoutConfig === 'infinite') {
            outbrainId = wz.config.template.nativeSettings.ob_widget_m_i || outbrainId;
        }
    }

    var override = wz.config.template.cpcWidgetsOverrideByPage && wz.config.template.cpcWidgetsOverrideByPage[pageNumber];

    if (override && override.outbrain && override.outbrain.outbrainId) {
        outbrainId = override.outbrain.outbrainId;
    } else if (override && override.general && override.general.outbrain && override.general.outbrain.outbrainId) {
        outbrainId = override.general.outbrain.outbrainId;
    }

    wz.tagMgr.loadOutbrain($e, wz.config.template.nativeSettings.ob_template, outbrainId);
};

wz.tagMgr.loadTaboolaRecommendations = function ($e) {
    const pageNumber = $e.closest('.article-page').data('page-num');

    const taboolaConfig = {
        placement: '',
        mode: '',
    };

    // Generate Placement
    if (wz.config.template.cpcWidgetsOverrideByPage) {
        if (wz.config.template.cpcWidgetsOverrideByPage[pageNumber] && wz.config.template.cpcWidgetsOverrideByPage[pageNumber]['taboola'] && wz.config.template.cpcWidgetsOverrideByPage[pageNumber]['taboola']['placement']) {
            taboolaConfig.placement = wz.config.template.cpcWidgetsOverrideByPage[pageNumber]['taboola']['placement'];
        } else if (wz.config.template.cpcWidgetsOverrideByPage['general'] && wz.config.template.cpcWidgetsOverrideByPage['general']['taboola'] && wz.config.template.cpcWidgetsOverrideByPage['general']['taboola']['placement']) {
            taboolaConfig.placement = wz.config.template.cpcWidgetsOverrideByPage['general']['taboola']['placement'];
        }
    }

    if (!taboolaConfig.placement) {
        taboolaConfig.placement = wz.config.template.device === 'phone' ? `${wz.config.template.siteShort}_INF_M300x250_1_2X1` : `${wz.config.template.siteShort}_INF_D300x250_1_3X1`;
    }

    if (wz.config.template.device === 'phone' && wz.config.template.nativeSmartFeedMobile) {
        taboolaConfig.placement = `${wz.config.template.siteShort}_INFWN_D1x1_SmartFeed`;
    }

    if (wz.config.template.nativeOverridePlacement) {
        taboolaConfig.placement = `${wz.config.template.siteShort}_${wz.config.template.nativeOverridePlacement}`;
    }

    // Generate Mode
    if (wz.config.template.cpcWidgetsOverrideByPage) {
        if (wz.config.template.cpcWidgetsOverrideByPage[pageNumber] && wz.config.template.cpcWidgetsOverrideByPage[pageNumber]['taboola'] && wz.config.template.cpcWidgetsOverrideByPage[pageNumber]['taboola']['mode']) {
            taboolaConfig.mode = wz.config.template.cpcWidgetsOverrideByPage[pageNumber]['taboola']['mode'];
        } else if (wz.config.template.cpcWidgetsOverrideByPage['general'] && wz.config.template.cpcWidgetsOverrideByPage['general']['taboola'] && wz.config.template.cpcWidgetsOverrideByPage['general']['taboola']['mode']) {
            taboolaConfig.mode = wz.config.template.cpcWidgetsOverrideByPage['general']['taboola']['mode'];
        }
    }

    if (!taboolaConfig.mode) {
        taboolaConfig.mode = wz.config.template.device === 'phone' ? 'thumbnails-e' : 'thumbnails-g';
    }

    // Create the recommendations container
    const containerId = `recommendations-${wz.layoutMgr.mobileRecommendationsTagIdx++}`;
    const adContainer = $('<div>').attr('id', containerId);
    $e.append(adContainer);

    // Load Taboola recommendations
    window._taboola = window._taboola || [];
    _taboola.push({
        mode: taboolaConfig.mode,
        container: containerId,
        placement: taboolaConfig.placement,
        target_type: 'mix'
    });
};

wz.tagMgr.observeExternalProviders = function () {
    try {
        wz.loggerMgr.log('observeExternalProviders');

        // outbrain
        $(document).on("click", "div[id^='outbrain_widget_']", function (event) {
            try {
                if (typeof WzEvent === "function") {
                    wz.loggerMgr.track('stats', 'outbrainProfiling', {network: 'outbrain', c1: document.referrer});
                }

                var placementSet = ($(this).parent().children(':first-child').attr("data-widget-id") || $(this).attr('data-widget-id'));
                placementSet = placementSet.replace(/[\[\]]/g, "");
                var device = wz.config.trackingChannel.device;
                if (wz.config.trackingChannel.device === 'phone') {
                    device = 'mobile';
                }
                placementSet = placementSet + '_' + wz.config.trackingChannel.channel + '_' + wz.config.template.pageVariation + ':' + device;

                if (wz.config.trackingChannel.device === 'phone' && wz.config.template.platform === 'iPhone') {
                    wz.pixelMgr.trackWithEstimateCpcDVLP('outbrain', placementSet);
                } else {
                    wz.pixelMgr.trackWithEstimateCpc('outbrain', placementSet);
                }
            } catch (e) {
                wz.loggerMgr.error('outbrain dvlp cpc event:' + e.message);
            }
        });
    } catch (e) {
        wz.loggerMgr.error('observeExternalProviders:' + e.message);
    }
};

wz.tagMgr.loadJsBodyEnd = function () {
    if (!wz.config.template.jsBodyEnd) {
        return;
    }

    wz.config.template.jsBodyEnd.forEach(function (item) {
        if (item.length > 0) {
            var x = document.createElement("script");
            x.type = 'text/javascript';
            x.lang = 'javascript';
            x.src = item;
            document.body.appendChild(x);
        }
    });
};

wz.tagMgr.createGermanImpressumPopup = function () {
    if (wz.config.template.country !== 'DE') {
        return;
    }

    $('.impressum-link').show();
    $('body').append('<div class="germanImpressum-popup"></div>');

    $('.germanImpressum-popup').load(wz.loadMgr.server + '/engine/common/impressum/?domain=' + wz.config.template.domain, function () {
        $('.germanImpressum-popup').append('<i class="fas fa-times" onclick="wz.tagMgr.closeGermanImpressumPopup()"></i>');
    });
};

wz.tagMgr.closeGermanImpressumPopup = function () {
    $('html').css('overflow', 'inherit');
    $('.germanImpressum-popup').hide();
    wz.lazyMgr.isTabActive = false;
};

wz.tagMgr.loadScoreSearch = function () {
    if (!wz.config.template.fanSidedDomain) {
        return;
    }

    var _comscore = _comscore || [];
    _comscore.push({c1: "2", c2: "18120612"});
    (function () {
        var s = document.createElement("script"), el = document.getElementsByTagName("script")[0];
        s.async = true;
        s.src = "https://sb.scorecardresearch.com/cs/18120612/beacon.js";
        el.parentNode.insertBefore(s, el);
    })();
};

wz.tagMgr.loadOpenWebScript = function () {
    if (!wz.config.template.openWebWidget) {
        return;
    }

    var script = document.createElement("script");
    script.type = "text/javascript";
    script.src = "https://launcher-sa.spot.im/spot/" + wz.config.template.openWebWidgetId;
    script.async = true;
    script.setAttribute("data-spotim-autorun", "false");
    script.setAttribute("data-spotim-module", "spotim-launcher");
    document.getElementsByTagName("head")[0].appendChild(script);
};

wz.tagMgr.loadFacebookPixels = function () {
    if (wz.config.template.facebookPixelId) {
        wz.config.template.facebookPixelId = '' + wz.config.template.facebookPixelId;
        wz.config.template.facebookPixelId.split(",").forEach(function (facebookPixelId) {
            !function (f, b, e, v, n, t, s) {
                if (f.fbq) return;
                n = f.fbq = function () {
                    n.callMethod ?
                        n.callMethod.apply(n, arguments) : n.queue.push(arguments)
                };
                if (!f._fbq) f._fbq = n;
                n.push = n;
                n.loaded = !0;
                n.version = '2.0';
                n.queue = [];
                t = b.createElement(e);
                t.async = !0;
                t.src = v;
                s = b.getElementsByTagName(e)[0];
                s.parentNode.insertBefore(t, s)
            }(window, document, 'script',
                'https://connect.facebook.net/en_US/fbevents.js');

            fbq('init', facebookPixelId, {'external_id': wz.config.trackingChannel.guid});

            if (wz.config.template.facebookMasterPixel) {
                fbq('init', '839891563339651');
            }

            fbq('track', 'PageView');

            if (wz.config.template.wzna) {
                fbq('trackCustom', 'bad_ip');
            }
        });
    }
};

wz.tagMgr.loadOutbrainPixels = function () {
    $.getJSON("https://cdn.wazimo.com/engine/common/server/services/outbrainClientPixel/?country=" +
        wz.config.template.country + "&device=" + wz.config.template.device + "&platform=" + wz.config.template.platform + "&static=true", function (response) {

        var OB_ADV_ID = [];

        if (response.length < 1 && wz.loadMgr.queryParams.get('omid')) {
            OB_ADV_ID = [wz.loadMgr.queryParams.get('omid')];
        } else {
            OB_ADV_ID = response;
        }

        !function (_window, _document) {
            if (_window.obApi) {
                var toArray = function (object) {
                    return Object.prototype.toString.call(object) === '[object Array]' ? object : [object];
                };
                _window.obApi.marketerId = toArray(_window.obApi.marketerId).concat(toArray(OB_ADV_ID));
                return;
            }
            var api = _window.obApi = function () {
                api.dispatch ? api.dispatch.apply(api, arguments) : api.queue.push(arguments);
            };
            api.version = '1.1';
            api.loaded = true;
            api.marketerId = OB_ADV_ID;
            api.queue = [];
            var tag = _document.createElement('script');
            tag.async = true;
            tag.src = '//amplify.outbrain.com/cp/obtp.js';
            tag.type = 'text/javascript';
            var script = _document.getElementsByTagName('script')[0];
            script.parentNode.insertBefore(tag, script);
        }(window, document);
        obApi('track', 'PAGE_VIEW');
    });
};

wz.tagMgr.loadTaboolaPixels = function () {
    if (wz.config.template.utm_source === 'taboola') {
        window._tfa = window._tfa || [];
        if (typeof window._tfa.push !== 'undefined') {
            window._tfa.push({notify: 'event', name: 'page_view', id: 1036720});
        }
        !function (t, f, a, x) {
            if (!document.getElementById(x)) {
                t.async = 1;
                t.src = a;
                t.id = x;
                f.parentNode.insertBefore(t, f);
            }
        }(document.createElement('script'),
            document.getElementsByTagName('script')[0],
            '//cdn.taboola.com/libtrc/unip/1036720/tfa.js',
            'tb_tfa_script');
    }
};

wz.tagMgr.loadGoogleAdsPixel = function () {
    try {
        var googleAdAccount = 'AW-647138062';
        if (wz.config.template.utm_source === 'google_az' || wz.config.template.utm_source === 'google_az2') {
            googleAdAccount = 'AW-10951908779';
        }

        let x = document.createElement("script");
        x.type = 'text/javascript';
        x.async = true;
        x.src = 'https://www.googletagmanager.com/gtag/js?id=' + googleAdAccount;
        x.onload = function () {
            window.dataLayer = window.dataLayer || [];
            window.gtag = function () {
                dataLayer.push(arguments);
            }

            gtag('js', new Date());
            gtag('config', googleAdAccount);
            gtag('config', 'AW-11130948784');
        }
        document.head.appendChild(x);
    } catch (e) {
        wz.loggerMgr.error('Email EXCEPTION: loadGoogleAdsPixel ' + ':' + e.message);
    }
};

wz.tagMgr.loadGeminiPixels = function () {
    if (wz.config.template.utm_source !== 'gemini') {
        return;
    }

    (function (w, d, t, r, u) {
        w[u] = w[u] || [];
        w[u].push({'projectId': '10000', 'properties': {'pixelId': '10080507'}});
        var s = d.createElement(t);
        s.src = r;
        s.async = true;
        s.onload = s.onreadystatechange = function () {
            var y, rs = this.readyState, c = w[u];
            if (rs && rs != "complete" && rs != "loaded") {
                return
            }
            try {
                y = YAHOO.ywa.I13N.fireBeacon;
                w[u] = [];
                w[u].push = function (p) {
                    y([p])
                };
                y(c)
            } catch (e) {
            }
        };
        var scr = d.getElementsByTagName(t)[0], par = scr.parentNode;
        par.insertBefore(s, scr)
    })(window, document, "script", "https://s.yimg.com/wi/ytc.js", "dotq");
};

wz.tagMgr.loadTiktokPixels = function () {
    if (wz.config.template.tiktokPixelId && wz.config.template.utm_source === 'tiktok') {
        // cast variable to string
        wz.config.template.tiktokPixelId = '' + wz.config.template.tiktokPixelId;
        wz.config.template.tiktokPixelId.split(",").forEach(function (tiktokPixelId) {
            !function (w, d, t) {
                w.TiktokAnalyticsObject = t;
                var ttq = w[t] = w[t] || [];
                ttq.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie"], ttq.setAndDefer = function (t, e) {
                    t[e] = function () {
                        t.push([e].concat(Array.prototype.slice.call(arguments, 0)))
                    }
                };
                for (var i = 0; i < ttq.methods.length; i++) ttq.setAndDefer(ttq, ttq.methods[i]);
                ttq.instance = function (t) {
                    for (var e = ttq._i[t] || [], n = 0; n < ttq.methods.length; n++) ttq.setAndDefer(e, ttq.methods[n]);
                    return e
                }, ttq.load = function (e, n) {
                    var i = "https://analytics.tiktok.com/i18n/pixel/events.js";
                    ttq._i = ttq._i || {}, ttq._i[e] = [], ttq._i[e]._u = i, ttq._t = ttq._t || {}, ttq._t[e] = +new Date, ttq._o = ttq._o || {}, ttq._o[e] = n || {};
                    var o = document.createElement("script");
                    o.type = "text/javascript", o.async = !0, o.src = i + "?sdkid=" + e + "&lib=" + t;
                    var a = document.getElementsByTagName("script")[0];
                    a.parentNode.insertBefore(o, a)
                };
                ttq.load(tiktokPixelId);
                ttq.page();
            }(window, document, 'ttq');
        });
    }
};

wz.tagMgr.loadTwitterPixels = function () {
    if (wz.config.template['twitterPixelId'] && wz.config.template.utm_source === 'twitter') {
        // cast variable to string
        wz.config.template.twitterPixelId = '' + wz.config.template.twitterPixelId;
        wz.config.template.twitterPixelId.split(",").forEach(function (twitterPixelId) {
            !function (e, t, n, s, u, a) {
                e.twq || (s = e.twq = function () {
                    s.exe ? s.exe.apply(s, arguments) : s.queue.push(arguments);
                }, s.version = '1.1', s.queue = [], u = t.createElement(n), u.async = !0, u.src = '//static.ads-twitter.com/uwt.js',
                    a = t.getElementsByTagName(n)[0], a.parentNode.insertBefore(u, a))
            }(window, document, 'script');

            twq('init',twitterPixelId);
            twq('track','PageView');
        });
    }
};

wz.tagMgr.loadGermanImpressumForm = function () {
    if (wz.config.template.country !== 'DE') {
        return;
    }

    setTimeout(function () {
        $('.germanImpressum-popup').show(200);
        $('html').css('overflow', 'hidden');
        wz.lazyMgr.isTabActive = false;
    }, 1000)
    wz.lazyMgr.isTabActive = true;
};

wz.tagMgr.loadOpenWebWidget = function ($obj) {
    if (!wz.config.template.openWebWidget) {
        return;
    }

    wz.tagMgr.openWebWidgetCounter++;

    $obj.append('<div class="ad-label">ADVERTISEMENT</div>');
    $obj.append('<div data-openweb-ad data-row="1" data-column="1"></div>');

    setTimeout(function () {
        if ($obj.find('div[data-openweb-ad]').data('rendered')) {
            wz.loggerMgr.track('stats', 'openweb_loaded', {network: 'openweb'});
        }
    }, 3000);
}
// END MMTagManager

// Start utilsMgr
wz.utils.createUniqId = function (prefix = "", random = false) {
    var n = performance.now();
    var base = Math.floor((performance.timeOrigin + Math.floor(n)) / 1000);
    var ext = Math.floor(n % 1000 * 1000);
    var now = ("00000000" + base.toString(16)).slice(-8) + ("000000" + ext.toString(16)).slice(-5);
    if (now <= window.my_las_uid) {
        now = (parseInt(window.my_las_uid ? window.my_las_uid : now, 16) + 1).toString(16);
    }
    window.my_las_uid = now;
    return (prefix ? prefix : '') + now;
};

wz.utils.handleScrollPercentage = function () {
    if (wz.config.template.utm_source !== 'gdn') {
        return;
    }

    var winHeight = $(window).height();
    var docHeight = $(document).height();
    var scrollTop = $(window).scrollTop(); //NaN or zero at top
    var trackLength = docHeight - winHeight;
    var pctScrolled = Math.floor(scrollTop / trackLength * 100);

    if (typeof gtag === "function") {
        if (pctScrolled >= 25 && pctScrolled <= 30) {
            gtag('event', 'conversion', {'send_to': 'AW-647138062/kisGCMa_rdADEI6WyrQC'});
        } else if (pctScrolled >= 50 && pctScrolled <= 55) {
            gtag('event', 'conversion', {'send_to': 'AW-647138062/6nT1CIXO49ADEI6WyrQC'});
        } else if (pctScrolled >= 75 && pctScrolled <= 80) {
            gtag('event', 'conversion', {'send_to': 'AW-647138062/0XAYCNnR49ADEI6WyrQC'});
        }
    }
};

wz.utils.handleTimeOnPage = function () {
    if (wz.config.template.utm_source !== 'gdn') {
        return;
    }

    requestAnimationFrame(function () {
        var timeNow = performance.now() / 1000 / 60;

        if (typeof gtag === "function") {
            if (timeNow >= 7 && timeNow < 8) {
                gtag('event', 'conversion', {'send_to': 'AW-647138062/xv5BCOeg49ADEI6WyrQC'});
            } else if (timeNow >= 8 && timeNow < 9) {
                gtag('event', 'conversion', {'send_to': 'AW-647138062/wKSsCN2mrdADEI6WyrQC'});
            } else if (timeNow >= 9 && timeNow < 10) {
                gtag('event', 'conversion', {'send_to': 'AW-647138062/2OJTCKm0rdADEI6WyrQC'});
            }
        }
    });
};

wz.utils.getCookies = function () {
    return document.cookie
        .split(';')
        .map(cookie => cookie.split('='))
        .reduce((accumulator, [key, value]) => ({...accumulator, [key.trim()]: decodeURIComponent(value)}), {});
};

window.wz_fb_init_counter = 0;
wz.utils.checkFbCookies = function() {
    if (window.wz_fb_init_counter > 10 || window.wz_fb_init_fired) {
        return;
    }
    window.wz_fb_init_counter++;

    var cookies = wz.utils.getCookies();
    var fbc = cookies._fbc || null;
    var fbp = cookies._fbp || null;

    if (fbp) {
        window.wz_fb_init_fired = true;
        wz.loggerMgr.track('stats', 'fb_init', {c1: fbp, c2: fbc});
    } else {
        setTimeout(wz.utils.checkFbCookies, 1000);
    }
}

wz.utils.checkGDNCookies = function() {
    if (wz.config.template.utm_source === 'gdn' && wz.loadMgr.queryParams.get('gclid')) {
        wz.logger.track('stats', 'gdn_init', {c1: wz.loadMgr.queryParams.get('gclid')});
    }
};
// END utilsMgr

// Start PbMgr
wz.pbMgr.init = function () {
    try {
        if (wz.pbMgr.isPrebidInited) {
            return;
        }

        wz.pbMgr.isPrebidInited = true;

        wz.loggerMgr.log('pbMgr.init');

        window.PREBID_TIMEOUT = wz.config.template.prebid_timeout || wz.pbConfig.PREBID_TIMEOUT;
        wz.pbMgr.bidgf = wz.config.template.pbbidgf || 1;

        if (wz.pbConfig.a9PubId) {
            wz.pbMgr.loadA9Script();
        }

        // keep a9 slot reference index
        wz.pbMgr.a9SlotsIndex = {};
        wz.pbConfig.dfpSlots.forEach(function (pbjsUnit) {
            wz.pbMgr.a9SlotsIndex[pbjsUnit.code] = {
                slotID: pbjsUnit.code,
                slotName: pbjsUnit.WzDfpSlot,
                sizes: pbjsUnit.sizes
            };
        });

        // init DFP
        googletag.cmd.push(function () {
            googletag.pubads().disableInitialLoad();

            googletag.pubads().setTargeting('campaign', wz.config.template.dfpChannelOverride || wz.config.trackingChannel.channel || 'missing');
            googletag.pubads().setTargeting('variation', wz.config.trackingChannel.variation || 'missing');
            googletag.pubads().setTargeting('source_variation', (wz.config.trackingChannel.source + '_' + wz.config.trackingChannel.variation + '_' + wz.config.trackingChannel.browser).toLowerCase());
            googletag.pubads().setTargeting('axa', wz.pbConfig.axa);
            googletag.pubads().setTargeting('source', wz.config.trackingChannel.source || 'none');
            googletag.pubads().setTargeting('testGroup', 'g' + wz.pbMgr.getTestGroup());

            googletag.pubads().setTargeting('cchannel', wz.config.trackingChannel.channel || 'none');
            googletag.pubads().setTargeting('country', wz.config.trackingChannel.country || 'none');
            googletag.pubads().setTargeting('domain', wz.config.trackingChannel.domain || 'none');
            googletag.pubads().setTargeting('device', wz.config.trackingChannel.device || 'none');
            googletag.pubads().setTargeting('os', wz.config.trackingChannel.platform || 'none');
            googletag.pubads().setTargeting('browser', wz.config.trackingChannel.browser || 'none');
            googletag.pubads().setTargeting('experiment', wz.config.trackingChannel.experiment || 'none');
            googletag.pubads().setTargeting('path', wz.config.trackingChannel.path || 'none');
            googletag.pubads().setTargeting('publisher', wz.config.trackingChannel.publisher || 'none');
            googletag.pubads().setTargeting('unitCode', 'missing');

            if (wz.config.template.exadxsticky) {
                googletag.pubads().setTargeting('exadxsticky', 'true');
            }

            googletag.pubads().addEventListener('slotRenderEnded', wz.pbMgr.dfpSlotRenderEndedHandler);
        });

        if (wz.config.template.enableIdentityLink) {
            wz.pbMgr.userIdsArray.push(
                {
                    name: "identityLink",
                    params: {
                        pid: '13815',
                        notUse3P: false
                    },
                    storage: {
                        type: "html5",
                        name: "idl_env",
                        expires: 15,
                        refreshInSeconds: 1800
                    }
                }
            );
        }

        if (wz.config.template.enable33AcrossIdentity) {
            wz.pbMgr.userIdsArray.push(
                {
                    name: "33acrossId",
                    params: {
                        pid: "0013300001jlr99AAA" // Our Partner ID
                    },
                    storage: {
                        name: "33acrossId",
                        type: "html5",
                        expires: 90,
                        refreshInSeconds: 8 * 3600
                    }
                }
            );
        }

        wz.pbMgr.initWzna();

        // init Prebid
        pbjs.que.push(function () {
            try {
                if (wz.config.template.wzna) return;

                pbjs.setConfig({
                    bidderTimeout: PREBID_TIMEOUT,
                    priceGranularity: 'high',
                    bidderSequence: 'fixed',
                    useBidCache: wz.pbMgr.useBidCache || false,
                    userSync: {
                        userIds: wz.pbMgr.userIdsArray,
                        iframeEnabled: 1,
                        syncDelay: 3000,
                        syncsPerBidder: 25,
                        aliasSyncEnabled: true
                    },
                    zemanta: {
                        bidderUrl: 'https://b1h.zemanta.com/api/bidder/prebid/bid/',
                        usersyncUrl: 'https://b1h.zemanta.com/usersync/prebid'
                    },
                    outbrain: {
                        bidderUrl: 'https://b1h.zemanta.com/api/bidder/prebid/bid/',
                        usersyncUrl: 'https://b1h.zemanta.com/usersync/prebid'
                    }
                });

                // Vidazoo
                if (!wz.config.template.disableMMPlusAlias) {
                    pbjs.aliasBidder('vidazoo', 'mmplus');
                }
                pbjs.aliasBidder('teads', 'teadsD');

                pbjs.bidderSettings = wz.pbMgr.getPbBidderSettings();

                // GDPR:
                if (wz.config.template.isGDPR) {
                    pbjs.setConfig({
                        consentManagement: {
                            gdpr: {
                                cmpApi: 'iab',
                                timeout: 8000
                            }
                        }
                    });
                }

                // CCPA:
                if (wz.config.template.isCCPA) {
                    // US Privacy timeout 100ms
                    pbjs.setConfig({
                        consentManagement: {
                            usp: {
                                cmpApi: 'iab',
                                timeout: 100
                            }
                        }
                    });
                }

                // assign events (e.g bidResponse/auctionInit/auctionEnd/bidWon)
                // http://prebid.org/dev-docs/publisher-api-reference.html#module_pbjs.onEvent
                pbjs.onEvent('bidResponse', function (bid) {
                    wz.loggerMgr.log(bid.adUnitCode, '.. bid response', bid.bidder, bid.cpm);
                });
            } catch (e) {
                wz.loggerMgr.error('pbjs init:' + e.message);
            }
        });

        setTimeout(wz.pbMgr.reportMissingObjects, 3000);

        if (wz.config.template.showInterstitial) {
            wz.pbMgr.configureInterstitial();
        }
    } catch (e) {
        wz.loggerMgr.error('wz.pbMgr.init: ' + e.message);
    }
};

wz.pbMgr.loadA9Script = function () {
    !function (a9, a, p, s, t, A, g) {
        if (a[a9]) return;

        function q(c, r) {
            a[a9]._Q.push([c, r])
        }

        a[a9] = {
            init: function () {
                q("i", arguments)
            }, fetchBids: function () {
                q("f", arguments)
            }, setDisplayBids: function () {
            }, targetingKeys: function () {
                return []
            }, _Q: []
        };
        A = p.createElement(s);
        A.async = !0;
        A.src = t;
        g = p.getElementsByTagName(s)[0];
        g.parentNode.insertBefore(A, g)
    }("apstag", window, document, "script", "//c.amazon-adsystem.com/aax2/apstag.js");

    apstag.init({
        pubID: wz.pbConfig.a9PubId,
        adServer: 'googletag'
    });
};

wz.pbMgr.reportMissingObjects = function () {
    try {
        if (typeof googletag !== "object") {
            wz.loggerMgr.error('reportMissingObjects: unexpected type googletag');
            return;
        }

        if (googletag == null) {
            wz.loggerMgr.error('reportMissingObjects: unexpected type googletag is null');
            return;
        }

        if (typeof googletag.cmd !== "object") {
            wz.loggerMgr.error('reportMissingObjects: unexpected type googletag.cmd - ' + typeof googletag.cmd);
            return;
        }

        if (typeof pbjs !== "object") {
            wz.loggerMgr.error('reportMissingObjects: unexpected type pbjs');
            return;
        }

        if (pbjs == null) {
            wz.loggerMgr.error('reportMissingObjects: unexpected type pbjs is null');
            return;
        }

        if (!googletag.pubads) {
            wz.loggerMgr.track('stats', 'dfptagMiss');
        }

        if (!pbjs.getHighestCpmBids) {
            wz.loggerMgr.track('stats', 'pbmiss');
        }
    } catch (e) {
        wz.loggerMgr.error('reportMissingObjects: ' + e.message);
    }
};

wz.pbMgr.dfpSlotRenderEndedHandler = function (dfpUnit) {
    pbjs.que.push(function () {
       try {
           if (dfpUnit.advertiserId === 1) {
               wz.loggerMgr.error('advertiserId1');
               return; // advertiserId=1 (isBackfill true) should be ignored
           }

           const adUnitCode = dfpUnit.slot.getSlotElementId();
           let pbBidder = dfpUnit.slot.getTargeting("hb_bidder").pop();
           let pbCpm = dfpUnit.slot.getTargeting("hb_pb").pop();

           if (isNaN(pbCpm)) {
               pbBidder = 'noBids';
               pbCpm = 0;
           }

           pbCpm = pbCpm / wz.pbMgr.bidgf;
           let bidder = wz.pbMgr.parseAdvertiserName(pbBidder, dfpUnit.advertiserId);
           let cpm = pbCpm;
           let a9amznbid = (bidder === 'a9') ? (wz.pbMgr.a9amznbid[adUnitCode] || null) : null;
           const dfpAdUnitName = dfpUnit.slot.getAdUnitPath();
           let legacyRev = 0;

           switch (bidder) {
               case 'adx':
                   legacyRev = 0;
                   break;
               case 'a9':
                   if (wz.loadMgr.a9_data[a9amznbid]) {
                       cpm = legacyRev = wz.loadMgr.a9_data[a9amznbid] / 1000;
                   }
                   break;
               default:
                   if (wz.loadMgr.lineItemsData && wz.loadMgr.lineItemsData[dfpUnit.sourceAgnosticLineItemId]) {
                       legacyRev = cpm = wz.loadMgr.lineItemsData[dfpUnit.sourceAgnosticLineItemId]['rate'];
                       bidder = 'direct_' + wz.loadMgr.lineItemsData[dfpUnit.sourceAgnosticLineItemId]['advertiserName'];
                   } else {
                       legacyRev = cpm;
                   }
           }

           let eventType = (dfpUnit.advertiserId === 0) ? 'dfp-order-zero' : (!dfpUnit.advertiserId ? 'dfp-order-null' : (bidder === 'adx' ? 'adx' : (bidder === 'a9' ? 'a9' : 'hb')));

           wz.loggerMgr.log(adUnitCode, '** dfpRender', cpm, bidder, dfpUnit.sourceAgnosticLineItemId, wz.loadMgr.lineItemsData[dfpUnit.sourceAgnosticLineItemId]);

           wz.loggerMgr.track(eventType, 'served', {
               revenue: legacyRev,
               cpm: cpm,
               unit: adUnitCode,
               network: bidder,
               account: bidder === 'adx' ? wz.pbConfig.dfpa : null,
               c1: dfpUnit.advertiserId,
               c2: pbCpm,
               c3: a9amznbid,
               c4: dfpUnit.sourceAgnosticCreativeId,
               c5: dfpUnit.sourceAgnosticLineItemId,
               software: (wz.pbMgr.intentIq && wz.pbMgr.intentIq.intentIqConfig && wz.pbMgr.intentIq.intentIqConfig.abTesting.currentTestGroup) || null,
               cid: dfpAdUnitName
           });

           if (wz.config.template.loadIntentIQ && wz.pbMgr.intentIq && legacyRev !== 0 && !bidder.includes('direct_')) {
               wz.loggerMgr.track(eventType, 'served_IIQ', {
                   revenue: 0,
                   cpm: -(cpm) * 0.05,
                   unit: adUnitCode,
                   network: bidder,
                   account: bidder === 'adx' ? wz.pbConfig.dfpa : null,
                   c1: dfpUnit.advertiserId,
                   c2: pbCpm,
                   c3: a9amznbid,
                   c4: dfpUnit.sourceAgnosticCreativeId,
                   c5: dfpUnit.sourceAgnosticLineItemId,
                   software: (wz.pbMgr.intentIq && wz.pbMgr.intentIq.intentIqConfig && wz.pbMgr.intentIq.intentIqConfig.abTesting.currentTestGroup) || null,
                   cid: dfpAdUnitName
               });

               wz.pbMgr.intentIq.reportExternalWin({
                   partnerAuctionId: '',
                   prebidAuctionId: wz.pbMgr.auctionProp[adUnitCode],
                   bidderCode: bidder,
                   cpm: legacyRev,
                   currency: 'USD',
                   originalCpm: legacyRev,
                   originalCurrency: 'USD',
                   status: 'rendered',
                   placementId: adUnitCode
               });
           }

           wz.pixelMgr.triggerClientPixel(cpm / 1000);
       } catch (e) {
           wz.loggerMgr.error('wz.pbMgr.dfpSlotRenderEndedHandler: ' + e.message);
       }
    });
};

wz.pbMgr.parseAdvertiserName = function (bidder, advertiserId) {
    try {
        const adx = [4521439414, 4566810452, 4600719339, 4660365269, 4698951063, 56863212];
        const a9 = [4602867486, 4585341822, 4603775432, 4681115516, 4710709154 , 4647355105];
        const target = [4689621307];
        const infolinks = [4975132478, 5120946206];
        const mybookie = [4997193328];

        if (advertiserId === 0) {
            return 'adx';
        }

        if (-1 !== adx.indexOf(advertiserId)) {
            return 'adx';
        } else if (-1 !== a9.indexOf(advertiserId)) {
            return 'a9';
        } else if (-1 !== target.indexOf(advertiserId)) {
            return 'target';
        } else if (-1 !== infolinks.indexOf(advertiserId)) {
            return 'infolinks';
        } else if (-1 !== mybookie.indexOf(advertiserId)) {
            return 'mybookie';
        } else {
            return bidder;
        }
    } catch (e) {
        wz.loggerMgr.error('wz.pbMgr.parseAdvertiserName: ' + e.message);
    }
};

wz.pbMgr.getPbBidderSettings = function () {
    const bidderSettings = {};
    try {
        wz.pbConfig.pbBidCpmAdjustment.forEach(function (bidder) {
            bidderSettings[bidder.adapter] = {
                bidCpmAdjustment: function (bidCpm) {
                    return bidCpm * bidder.factor * wz.pbMgr.bidgf;
                }
            };
        });

        return bidderSettings;
    } catch (e) {
        wz.loggerMgr.error('wz.pbMgr.getPbBidderSettings: ' + e.message);
        return bidderSettings;
    }
};

wz.pbMgr.getTestGroup = function () {
    let testGroup;
    if (localStorage.getItem('wzTestGroup')) {
        testGroup = localStorage.getItem('wzTestGroup');
    } else {
        testGroup = Math.floor(Math.random() * 10);
        localStorage.setItem('wzTestGroup', testGroup);
    }

    return parseInt(testGroup);
};

wz.pbMgr.configureInterstitial = function () {
    // INTERSTITIAL experiment (PT only)
    googletag.cmd.push(function () {
        const slot = googletag.defineOutOfPageSlot('/21740326310/PT_Gallery_D300x250_4', googletag.enums.OutOfPageFormat.INTERSTITIAL);
        if (slot) slot.addService(googletag.pubads());
        googletag.enableServices();
        // NOTE! Consider delaying until first div on page
        // googletag.display( slot );
        $(document).ready(function () {
            googletag.display(slot);
            console.log('Loading Interstitial', slot)
        });
    });
};

wz.pbMgr.initWzna = function () {
    if (wz.config.template.wzna || wz.loadMgr.cookieGet('_wz.wzna')) {
        wz.pbMgr.noAds();
    }
};

wz.pbMgr.noAds = function () {
    wz.loggerMgr.log('noAds');
    wz.layoutMgr.cookieSet('_wz.wzna', true);
    wz.config.template.wzna = true;
    $('#mmvid').remove();
};

wz.pbMgr.duplicateAdSlot = function ($target, wzUnit) {
    try {
        if (wz.config.template.disablePrebid) {
            return;
        }

        wz.pbMgr.checkBidderStatus(wzUnit);

        googletag.cmd.push(function () {
            try {
                var pbjsNewUnit = JSON.parse(JSON.stringify(wz.pbConfig.pbAdUnits[wzUnit])); // clone the object
                wz.pbMgr.duplicateAdSlotUx++;
                pbjsNewUnit.code = "div-gpt-ad-" + wz.pbMgr.duplicateAdSlotUx;

                var adContainer = document.createElement("div");
                adContainer.id = pbjsNewUnit.code;
                adContainer.className = 'wzDfpAd';
                adContainer.wzpbadloaded = false;
                adContainer.setAttribute('wzpbadloaded', false);
                $target.append(adContainer);

                var dfpSlot = wz.pbConfig.dfpSlots[wzUnit];
                wz.loggerMgr.log(pbjsNewUnit.code, 'duplicateAdSlot', dfpSlot.WzDfpSlot);
                var dfpSlotObj = googletag.defineSlot(dfpSlot.WzDfpSlot, dfpSlot.sizes, pbjsNewUnit.code).addService(googletag.pubads());

                dfpSlotObj.setTargeting('unitCode', pbjsNewUnit.code);

                // **************** excludeAxa ****************
                var excludeAxa = false;
                wz.loggerMgr.log('excludeAxa ???', wz.config.template.domain, wz.pbConfig.pbAdUnits[wzUnit].code);
                if ('div-gpt-ad-5555555555555-321' === wz.pbConfig.pbAdUnits[wzUnit].code) {
                    excludeAxa = true;
                }

                if (excludeAxa && wz.config.template.domain !== 'parentztalk.com') {
                    wz.loggerMgr.log('excludeAxa ***', wz.config.template.domain, wz.pbConfig.pbAdUnits[wzUnit].code);
                    dfpSlotObj.setTargeting('axa', 'aplcontrol');
                }
                // **************** excludeAxa end ****************

                // keep dfp object reference index
                wz.pbMgr.dfpObjectIndex[pbjsNewUnit.code] = dfpSlotObj;

                // keep a9 slot reference index
                wz.pbMgr.a9SlotsIndex[pbjsNewUnit.code] = {
                    slotID: pbjsNewUnit.code,
                    slotName: dfpSlot.WzDfpSlot,
                    sizes: dfpSlot.sizes
                };

                googletag.enableServices();

                googletag.display(pbjsNewUnit.code);

                pbjs.que.push(function () {
                    try {
                        wz.pbMgr.pbObjectIndex[pbjsNewUnit.code] = pbjsNewUnit;
                        pbjs.addAdUnits(pbjsNewUnit);
                    } catch (e) {
                        wz.loggerMgr.error('pbjs.addAdUnits: ' + e.message);
                    }
                });

                wz.pbMgr.requestBidsByCode(pbjsNewUnit.code);
            } catch (e) {
                wz.loggerMgr.error('duplicateAdSlot: ' + e.message);
            }

        });
    } catch (e) {
        wz.loggerMgr.error('duplicateAdSlotWrapper v2: ' + e.message);
    }
};

wz.pbMgr.checkBidderStatus = function (adUnitIndex) {
    if (wz.pbMgr.totalRequestsSent === 0 || !wz.config.template.pauseBiddersForXWin) {
        return;
    }

    Object.keys(wz.pbMgr.bidsMonitorCount).forEach(function(key) {
        if (wz.config.template.pauseBiddersForXWin[key]) {
            if (wz.config.template.pauseBiddersForXWin[key] >= (wz.pbMgr.totalRequestsSent - wz.pbMgr.bidsMonitorCount[key])) {
                wz.pbConfig.pbAdUnits[adUnitIndex].bids.forEach( function (bidder, index) {
                    if (key === bidder.bidder) {
                        wz.pbConfig.pbAdUnits[adUnitIndex].bids.splice(index, 1);
                    }
                });
            } else {
                delete wz.pbMgr.bidsMonitorCount[key];
            }
        }
    });
}

wz.pbMgr.requestBidsByCode = function (dfpDivId) {
    if (wz.config.template.wzna) return;

    wz.pbMgr.adserverRequestSent[dfpDivId] = false;
    wz.pbMgr.pendingAuctions[dfpDivId] = 0;

    pbjs.que.push(function () {
        try {
            wz.loggerMgr.log(dfpDivId, '****** requestBidsByCode');

            // pb request bids
            wz.pbMgr.pendingAuctions[dfpDivId]++;
            pbjs.requestBids({
                timeout: PREBID_TIMEOUT,
                adUnitCodes: [dfpDivId],
                bidsBackHandler: function (bids, timedOut, auctionId) {
                    try {
                        wz.pbMgr.totalRequestsSent++;
                        wz.pbMgr.auctionProp[dfpDivId] = auctionId;
                        wz.pbMgr.bidsMonitorReceivedHandler(bids);
                        wz.pbMgr.auctionEnded(dfpDivId, 'pb');
                    } catch (e) {
                        wz.loggerMgr.error('requestBidsByCode bidsBackHandler:' + e.message);
                    }
                }
            });

            // a9 request bids
            if (typeof apstag !== 'undefined') {
                wz.pbMgr.pendingAuctions[dfpDivId]++;
                apstag.fetchBids({
                    slots: [wz.pbMgr.a9SlotsIndex[dfpDivId]],
                    timeout: PREBID_TIMEOUT
                }, function (bids) {
                    try {
                        wz.pbMgr.auctionEnded(dfpDivId, 'a9');
                    } catch (e) {
                        wz.loggerMgr.error('requestBidsByCode apstag:' + e.message);
                    }
                });
            }

            wz.loggerMgr.track('stats', 'requestBids', {target: 'logs', count: 1, unit: dfpDivId});
        } catch (e) {
            wz.loggerMgr.error('requestBidsByCode:' + e.message);
        }
    });

    // failsafe
    setTimeout(function () {
        try {
            wz.pbMgr.auctionEnded(dfpDivId, 'failsafe');
        } catch (e) {
            wz.loggerMgr.error('requestBidsByCode failsafe: ' + e.message);
        }
    }, PREBID_TIMEOUT);
};

wz.pbMgr.auctionEnded = function (dfpDivId, type) {
    try {
        if (type !== 'failsafe') {
            wz.pbMgr.pendingAuctions[dfpDivId]--;
        }
        wz.loggerMgr.log(dfpDivId, 'auctionEnded: ' + type, wz.pbMgr.pendingAuctions[dfpDivId]);

        // update pendingAuctions counter
        if (type === 'failsafe' || wz.pbMgr.pendingAuctions[dfpDivId] <= 0) {
            wz.pbMgr.sendAdserverRequest(dfpDivId);
        }
    } catch (e) {
        wz.loggerMgr.error('auctionEnded:' + e.message);
    }
};

wz.pbMgr.sendAdserverRequest = function (dfpDivId) {
    if (wz.config.template.wzna) return;

    // run once
    if (wz.pbMgr.adserverRequestSent[dfpDivId]) return;
    wz.pbMgr.adserverRequestSent[dfpDivId] = true;

    googletag.cmd.push(function () {
        try {
            wz.loggerMgr.log(dfpDivId, 'sendAdserverRequest');
            var dfpSlotObj = wz.pbMgr.dfpObjectIndex[dfpDivId];

            if (pbjs.setTargetingForGPTAsync) {
                pbjs.setTargetingForGPTAsync([dfpDivId]);
            }

            if (typeof apstag !== 'undefined') {
                apstag.setDisplayBids();
                wz.pbMgr.a9amznbid[dfpDivId] = dfpSlotObj.getTargeting("amznbid").pop() || null;
            }

            googletag.pubads().refresh([dfpSlotObj]);
        } catch (e) {
            if (!(wz.config.trackingChannel.details === 'adblockerDetected')) {
                wz.loggerMgr.error('sendAdserverRequest: ' + e.message);
            }
        }
    });
};

wz.pbMgr.bidsMonitorReceivedHandler = function (bids) {
    if (Object.keys(bids).length === 0) {
        return;
    }

    try {
        var arr = bids[Object.keys(bids)[0]].bids;
        arr.forEach(function (e) {
            if (!wz.pbMgr.bidsMonitorCount[e.bidderCode]) {
                wz.pbMgr.bidsMonitorCount[e.bidderCode] = wz.pbMgr.totalRequestsSent;
            }
        });
    } catch (e) {
        wz.loggerMgr.error('bidsMonitorReceivedHandler: ' + e.message);
    }
};

wz.pbMgr.reset30secRefresh = function (callback) {
    if (wz.pbMgr.reset30secRefreshId) {
        clearInterval(wz.pbMgr.reset30secRefreshId);
    }
    wz.config.template.refreshAfterTime = wz.config.template.refreshAfterTime || 30000;
    wz.pbMgr.reset30secRefreshId = setInterval(callback, wz.config.template.refreshAfterTime);
};

wz.pbMgr.destroyAndDuplicateAd = function ($obj, divCode, hbUnitIdx) {
    googletag.cmd.push(function () {
        try {
            if (wz.pbConfig.pbAdUnits && wz.pbConfig.pbAdUnits[hbUnitIdx] && wz.pbConfig.pbAdUnits[hbUnitIdx].code === 'div-gpt-ad-5555555555555-111') {
                return true;
            }

            wz.pbMgr.deletedSlots.push(divCode);
            googletag.destroySlots([wz.pbMgr.dfpObjectIndex[divCode]]);
            wz.pbMgr.duplicateAdSlot($obj, hbUnitIdx);
            $('#' + divCode).remove();
        } catch (e) {
            wz.loggerMgr.error('error: wz.layoutMgr.destroyAndDuplicateAd ' + e.message);
        }
    });
};
// END PbMgr

// Start pixelMgr
wz.pixelMgr.triggerClientPixel = function (cpm) {
    if (cpm === 0) {
        cpm = 0.0001;
    }

    if (!wz.pixelMgr.user_session) {
        wz.loggerMgr.log('triggerClientPixel: getting user_session from storage');
        wz.pixelMgr.user_session = JSON.parse(sessionStorage.getItem('w_user'));
    }

    if (wz.pixelMgr.user_session == null) {
        wz.loggerMgr.log('triggerClientPixel: creating an empty user_session');
        wz.pixelMgr.user_session = {
            sessionRpm: 0,
            eventCategory: ['control']
        };
    }

    // User Ads
    if (!wz.pixelMgr.user_ads) {
        wz.loggerMgr.log('triggerClientPixelByAds: getting user_ads from storage');
        wz.pixelMgr.user_ads = JSON.parse(sessionStorage.getItem('w_ads_user'));
    }
    if (wz.pixelMgr.user_ads == null) {
        wz.loggerMgr.log('triggerClientPixelByAds: creating an empty user_ads');
        wz.pixelMgr.user_ads = {
            totalAds: 0,
            eventCategory: 'name_page_0'
        };
    }

    wz.loggerMgr.log('triggerClientPixel: cpm:' + (cpm * 1000) + ' sessionRpm:' + wz.pixelMgr.user_session.sessionRpm * 1000);

    wz.pixelMgr.user_session.sessionRpm = wz.pixelMgr.user_session.sessionRpm + cpm;
    wz.pixelMgr.user_ads.totalAds++;
    var userValue = (wz.pixelMgr.user_session.sessionRpm * 1000);

    if (typeof fbq === "function" && wz.config.template.utm_source === 'facebook') {
        // Ads Count
        fbq('trackCustom', 'name_page_' + wz.pixelMgr.user_ads.totalAds);

        wz.pbMgr.triggerFbPixelByAudience(userValue);
    }

    if (typeof window._tfa !== 'undefined' && wz.config.template.utm_source === 'taboola') {
        wz.pixelMgr.triggerTaboolaPixelByAudience(userValue);
    }

    if (typeof window.obApi !== 'undefined' && wz.config.template.utm_source === 'outbrain') {
        wz.pixelMgr.triggerOutbrainPixelByAudience(userValue);
    }

    if (typeof gtag === "function" && wz.config.template.utm_source === 'gdn') {
        wz.pixelMgr.triggerGDNPixelByAudience(userValue);
    }

    if (typeof window.dotq !== 'undefined' && wz.config.template.utm_source === 'gemini') {
        wz.pixelMgr.triggerGeminiPixelByAudience(userValue);
    }

    sessionStorage.setItem("w_user", JSON.stringify(wz.pixelMgr.user_session));
};

wz.pixelMgr.triggerFbPixelByAudience = function(userValue) {
    const thresholds = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180];
    const eventCategories = ['atv10', 'atv20', 'atv30', 'atv40', 'atv50', 'atv60', 'atv70', 'atv80', 'atv90', 'atv100', 'atv110', 'atv120', 'atv130', 'atv140', 'atv150', 'atv160', 'atv170', 'atv180'];
    const eventValues = ['tval10', 'tval20', 'tval30', 'tval40', 'tval50', 'tval60', 'tval70', 'tval80', 'tval90', 'tval100', 'tval110', 'tval120', 'tval130', 'tval140', 'tval150', 'tval160', 'tval170', 'tval180'];

    for (let i = 0; i < thresholds.length; i++) {
        if (userValue >= thresholds[i] && !wz.pixelMgr.user_session.eventCategory.includes(eventCategories[i])) {
            fbq('trackCustom', eventValues[i]);
            fbq('trackCustom', eventCategories[i]);
            wz.pixelMgr.user_session.eventCategory.push(eventCategories[i]);
        }
    }
}

wz.pixelMgr.triggerTaboolaPixelByAudience = function(userValue) {
    const thresholds = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180];
    const eventCategories = ['atv10', 'atv20', 'atv30', 'atv40', 'atv50', 'atv60', 'atv70', 'atv80', 'atv90', 'atv100', 'atv110', 'atv120', 'atv130', 'atv140', 'atv150', 'atv160', 'atv170', 'atv180'];
    const eventValues = ['tval10', 'tval20', 'tval30', 'tval40', 'tval50', 'tval60', 'tval70', 'tval80', 'tval90', 'tval100', 'tval110', 'tval120', 'tval130', 'tval140', 'tval150', 'tval160', 'tval170', 'tval180'];

    for (let i = 0; i < thresholds.length; i++) {
        if (userValue >= thresholds[i] && !wz.pixelMgr.user_session.eventCategory.includes(eventCategories[i])) {
            window._tfa.push({notify: 'event', name: eventValues[i], id: 1036720});
            window._tfa.push({notify: 'event', name: eventCategories[i], id: 1036720});
            wz.pixelMgr.user_session.eventCategory.push(eventCategories[i]);
        }
    }
}

wz.pixelMgr.triggerOutbrainPixelByAudience = function(userValue) {
    const thresholds = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180];
    const eventCategories = ['atv10', 'atv20', 'atv30', 'atv40', 'atv50', 'atv60', 'atv70', 'atv80', 'atv90', 'atv100', 'atv110', 'atv120', 'atv130', 'atv140', 'atv150', 'atv160', 'atv170', 'atv180'];
    const eventValues = ['tval10', 'tval20', 'tval30', 'tval40', 'tval50', 'tval60', 'tval70', 'tval80', 'tval90', 'tval100', 'tval110', 'tval120', 'tval130', 'tval140', 'tval150', 'tval160', 'tval170', 'tval180'];

    for (let i = 0; i < thresholds.length; i++) {
        if (userValue >= thresholds[i] && !wz.pixelMgr.user_session.eventCategory.includes(eventCategories[i])) {
            window.obApi('track', eventValues[i]);
            window.obApi('track', eventCategories[i]);
            wz.pixelMgr.user_session.eventCategory.push(eventCategories[i]);
        }
    }
}

wz.pixelMgr.triggerGDNPixelByAudience = function(userValue) {
    const thresholds = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180];
    const eventCategories = ['total_val_10', 'total_val_20', 'total_val_30', 'total_val_40', 'total_val_50', 'total_val_60', 'total_val_70', 'total_val_80', 'total_val_90', 'total_val_100', 'total_val_110', 'total_val_120', 'total_val_130', 'total_val_140', 'total_val_150', 'total_val_160', 'total_val_170', 'total_val_180'];

    for (let i = 0; i < thresholds.length; i++) {
        if (userValue >= thresholds[i] && !wz.pixelMgr.user_session.eventCategory.includes(eventCategories[i])) {
            var googleLabel = wz.pixelMgr.parseGDNEvent(wz.pixelMgr.getGDNAudience(eventCategories[i]));
            gtag('event', 'conversion', {'send_to': 'AW-647138062/' + googleLabel});
            wz.pixelMgr.user_session.eventCategory.push(eventCategories[i]);
        }
    }
};

wz.pixelMgr.triggerGeminiPixelByAudience = function(userValue) {
    const thresholds = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150, 160, 170, 180];
    const eventCategories = ['atv10', 'atv20', 'atv30', 'atv40', 'atv50', 'atv60', 'atv70', 'atv80', 'atv90', 'atv100', 'atv110', 'atv120', 'atv130', 'atv140', 'atv150', 'atv160', 'atv170', 'atv180'];

    for (let i = 0; i < thresholds.length; i++) {
        if (userValue >= thresholds[i] && !wz.pixelMgr.user_session.eventCategory.includes(eventCategories[i])) {
            window.dotq.push(
                {
                    'projectId': '10000',
                    'properties': {
                        'pixelId': '10080507',
                        'qstrings': {
                            'et': 'custom',
                            'product_id': 'cpm',
                            'ea': "Purchase",
                            'ec': eventCategories[i],
                            'gv': userValue
                        }
                    }
                });
            wz.pixelMgr.user_session.eventCategory.push(eventCategories[i]);
        }
    }
}

wz.pixelMgr.parseGDNEvent = function (conversionName) {
    var conversionsMap = {
        tv10: "VFT4CLPhwdMDEI6WyrQC",
        tv20: "SPEOCLKJkoACEI6WyrQC",
        tv50: "_k9-CKvB-_8BEI6WyrQC",
        tv60: "cupKCK7H-_8BEI6WyrQC",
        tv70: "lOA1CJnDmYACEI6WyrQC",
        tv80: "ZHBZCLnFmYACEI6WyrQC",
        tv90: "4xbECOTNj8MCEI6WyrQC",
        tv100: "IHLnCJ6vjsMCEI6WyrQC",
        tv110: "WBA0CIy7kMMCEI6WyrQC",
        atv50: "tRgkCNWdkoACEI6WyrQC",
        atv60: "p3xcCK32jYkCEI6WyrQC",
        atv70: "gFwTCOvX-_8BEI6WyrQC",
        atv80: "IMr_CPqkkoACEI6WyrQC",
        atv90: "BzyyCOGSjsMCEI6WyrQC",
        atv100: "hABaCKiVkMMCEI6WyrQC",
        atv110: "WBA0CIy7kMMCEI6WyrQC",
        page_10: "kLPYCOesl88BEI6WyrQC",
        page_15: "Rx_CMGwl88BEI6WyrQC",
        page_20: "T4MnCKuvl88BEI6WyrQC",
        page_30: "pszCCMjFk_0BEI6WyrQC",
        page_40: "2nS9CIXbiv0BEI6WyrQC",
        page_50: "rHeCCLPb8vwBEI6WyrQC",
        page_60: "l1KwCM7k8vwBEI6WyrQC",
        video_ad_4: "RoByCOOxkMMCEI6WyrQC",
        video_ad_6: "8OdCCO24kMMCEI6WyrQC",
        video_ad_8: "sybPCJ3268ICEI6WyrQC",
        video_ad_10: "XlmtCIfKkMMCEI6WyrQC",
        video_ad_12: "XlmtCIfKkMMCEI6WyrQC",
        total_val_10: "M17oCMbjhJcYEI6WyrQC",
        total_val_20: "wa4bCJ6vj5cYEI6WyrQC",
        total_val_30: "euB0CIz0hJcYEI6WyrQC",
        total_val_40: "6jWqCKzQhZcYEI6WyrQC",
        total_val_50: "V6KHCKShkJcYEI6WyrQC",
        total_val_60: "V7uDCJLjhZcYEI6WyrQC",
        total_val_70: "SxVnCI2rkJcYEI6WyrQC",
        total_val_80: "2nzrCKrshZcYEI6WyrQC",
        total_val_90: "mM9ECM3BjJcYEI6WyrQC",
        total_val_100: "HlqJCNXDjJcYEI6WyrQC",
        total_val_110: "CPB1CJrHjJcYEI6WyrQC",
        total_val_120: "CrfjCIS6kJcYEI6WyrQC",
        total_val_130: "cpMsCInLjJcYEI6WyrQC",
        total_val_140: "rCrNCMrBkJcYEI6WyrQC",
        total_val_150: "5o6zCLzXjJcYEI6WyrQC",
        total_val_160: "4b4NCNOGhpcYEI6WyrQC",
        total_val_170: "z6yrCODdjJcYEI6WyrQC",
        total_val_180: "qQkbCMnhjJcYEI6WyrQC",
    };

    return conversionsMap[conversionName] || false;
};

wz.pixelMgr.trackWithEstimateCpc = function (network, placementSet) {
    var url = "//cdn.wazimo.com/engine/common/server/services/estimateCpc/?" + $.param({
        network: network,
        placementSet: placementSet,
        country: wz.config.trackingChannel.country,
        device: wz.config.trackingChannel.device,
        domain: wz.config.trackingChannel.domain,
        source: wz.config.trackingChannel.source
    });

    $.ajax({url: url, method: "GET", dataType: "json"}).done(function (data) {
        wz.loggerMgr.track('stats', 'cpc', {
            network: network,
            revenue: data.data ? data.data : 0,
            details: placementSet,
            c1: data.by
        });
    }).fail(function (xhr, status, error) {
        wz.loggerMgr.error('trackWithEstimateCpc: ' + JSON.stringify(error));
    });
};

wz.pixelMgr.trackWithEstimateCpcDVLP = function (network, placementSet) {
    if (wz.config.template._native_placements) {
        var placementSetData = wz.config.template._native_placements[placementSet] || {};
        wz.loggerMgr.track('stats', 'cpc', {
            network: network,
            revenue: placementSetData.data || 0,
            details: placementSet,
            c1: placementSetData.by || null
        });
    } else {
        wz.pixelMgr.trackWithEstimateCpc(network, placementSet);
    }
};

wz.pixelMgr.triggerVideoAds = function (network) {
    try {
        wz.pixelMgr.vAds = JSON.parse(sessionStorage.getItem('_wz_v')) || {count: 0};
        wz.pixelMgr.vAds.count++;
        sessionStorage.setItem("_wz_v", JSON.stringify(wz.pixelMgr.vAds));

        var eventCategory = 'video_ad_1';
        if (wz.pixelMgr.vAds.count > 2 && wz.pixelMgr.vAds.count <= 4) {
            eventCategory = 'video_ad_2';
        }
        if (wz.pixelMgr.vAds.count > 4 && wz.pixelMgr.vAds.count <= 6) {
            eventCategory = 'video_ad_4';
        }
        if (wz.pixelMgr.vAds.count > 6 && wz.pixelMgr.vAds.count <= 8) {
            eventCategory = 'video_ad_6';
        }
        if (wz.pixelMgr.vAds.count > 8 && wz.pixelMgr.vAds.count <= 10) {
            eventCategory = 'video_ad_8';
        }
        if (wz.pixelMgr.vAds.count > 10 && wz.pixelMgr.vAds.count <= 12) {
            eventCategory = 'video_ad_10';
        }
        if (wz.pixelMgr.vAds.count > 12 && wz.pixelMgr.vAds.count <= 14) {
            eventCategory = 'video_ad_12';
        }
        if (wz.pixelMgr.vAds.count > 14 && wz.pixelMgr.vAds.count <= 16) {
            eventCategory = 'video_ad_14';
        }
        if (wz.pixelMgr.vAds.count > 16 && wz.pixelMgr.vAds.count <= 18) {
            eventCategory = 'video_ad_16';
        }
        if (wz.pixelMgr.vAds.count > 18 && wz.pixelMgr.vAds.count <= 20) {
            eventCategory = 'video_ad_18';
        }
        if (wz.pixelMgr.vAds.count > 20 && wz.pixelMgr.vAds.count <= 25) {
            eventCategory = 'video_ad_20';
        }
        if (wz.pixelMgr.vAds.count > 25 && wz.pixelMgr.vAds.count <= 30) {
            eventCategory = 'video_ad_25';
        }
        if (wz.pixelMgr.vAds.count > 30) {
            eventCategory = 'video_ad_30';
        }

        if (typeof fbq === "function") {
            fbq('trackCustom', eventCategory);
        }

        // Outbrain
        if (typeof window.obApi !== 'undefined' && wz.pixelMgr.vAds.count > 2) {
            var eventCategoryOB = eventCategory.replace('_', '');
            eventCategoryOB = eventCategoryOB.replace('_', '');
            window.obApi('track', eventCategoryOB);
        }

        // Taboola
        if (typeof window._tfa !== 'undefined' && wz.pixelMgr.vAds.count > 2) {
            window._tfa.push({notify: 'event', name: eventCategory, id: 1036720});
        }

        // GDN
        if (wz.pixelMgr.vAds.count > 2 && typeof gtag === "function") {
            var googleConversionLabel = wz.pixelMgr.parseGDNEvent(eventCategory);
            if (googleConversionLabel) {
                gtag('event', 'conversion', {'send_to': 'AW-647138062/' + googleConversionLabel});
            }
        }

        // Gemini
        if (typeof window.dotq !== 'undefined' && wz.pixelMgr.vAds.count > 2) {
            window.dotq.push(
                {
                    'projectId': '10000',
                    'properties': {
                        'pixelId': '10080507',
                        'qstrings': {
                            'et': 'custom',
                            'product_id': 'cpm',
                            'ea': "Purchase",
                            'ec': eventCategory
                        }
                    }
                });
        }
    } catch (e) {
        wz.loggerMgr.error('triggerVideoAds:' + e.message);
    }
};
// END pixelMgr

// Start lazyMgr
wz.lazyMgr.startLazyloadListener = function (callback) {
    wz.lazyMgr.lazyloadCallbacks.push(callback);

    if (!wz.lazyMgr.lazyloadListenerRunning) {
        wz.lazyMgr.lazyloadListenerRunning = true;
        $(window).on('DOMContentLoaded load resize scroll', function () {
            wz.lazyMgr.lazyloadDirtyFlag = true;
            wz.lazyMgr.isTabActive = true;
        });
        setInterval(wz.lazyMgr.lazyloadHandler, 250);
    }
};

wz.lazyMgr.lazyloadHandler = function () {
    if (wz.lazyMgr.lazyloadHandlerBusy) {
        return;
    }

    if (!wz.lazyMgr.lazyloadDirtyFlag) {
        return;
    }

    wz.lazyMgr.lazyloadHandlerBusy = true;
    wz.lazyMgr.lazyloadDirtyFlag = false;

    wz.lazyMgr.lazyloadCallbacks.forEach(function(callback) {
        try {
            callback();
        } catch (e) {
            wz.loggerMgr.error('lazyloadHandler: ' + e.message);
        }
    });

    wz.lazyMgr.lazyloadHandlerBusy = false;
};

wz.lazyMgr.isPartialElementInViewport = function (el, aheadPixels) {
    if (!aheadPixels) {
        aheadPixels=0;
    }

    //special bonus for those using jQuery
    if (typeof jQuery === "function" && el instanceof jQuery) {
        el = el[0];
    }

    var rect = el.getBoundingClientRect();

    // Taboola's "Load Too Many Pages" bugfix
    if (rect.top === 0) {
        return false;
    }

    return ((rect.top <= (window.innerHeight+aheadPixels) && rect.bottom >= 0) && getComputedStyle(el).display !== "none");
};
// END lazyMgr

// Start layoutMgr
wz.layoutMgr.init = function () {
  try {
      wz.layoutMgr.onScreenLog('init', wz.config.trackingChannel.variation, wz.config.template.layoutConfig);
      wz.tagMgr.initNative();

      wz.tagMgr.loadAccessibilityWidget();

      if (wz.config.template['newSession']) {
          wz.loggerMgr.track('paid', 'startArticle');
          wz.loggerMgr.track('session', 'session', {target: 'sessions'});

          if (wz.config.template.utm_source === 'gdn' && wz.config.template.utm_campaign.includes('pmax')) {
              wz.loggerMgr.track('logs', 'gdn_session', {target: 'logs', c1: document.referrer || 'none'});
          }


          if (wz.loadMgr.queryParams.get('wzguid')) {
              wz.loggerMgr.track('acquisition','emailClicked', {
                  guid: wz.loadMgr.queryParams.get('wzguid'),
                  application: 'notify',
                  module: 'notify',
                  target: 'notify'
              });
          }

          // Handle Taboola Real Cost
          if (wz.config.template.utm_source === 'taboola' && wz.loadMgr.queryParams.get('utm_key')) {
              navigator.sendBeacon('https://content.wazimo.com/engine/common/server/services/taboolaRealCost/?key=' + wz.loadMgr.queryParams.get('utm_key'), JSON.stringify(wz.config.trackingChannel));
          }
      } else {
          wz.loggerMgr.track('stats', 'startArticleHit');
      }

      wz.tagMgr.loadVidazooHBScript();

      switch (wz.config.template.layoutConfig) {
          case 'infinite':
              wz.layoutMgr.initLayoutInfinite();
              break;
      }

      wz.tagMgr.observeExternalProviders();
      wz.tagMgr.loadJsBodyEnd();
      wz.layoutMgr.handleWindowResize();
      wz.tagMgr.createGermanImpressumPopup();
      wz.tagMgr.loadScoreSearch();

      setTimeout(function(){
          if (wz.config.template.skipInitPixels) {
              return;
          }

          wz.tagMgr.loadFacebookPixels();
          wz.tagMgr.loadOutbrainPixels();
          wz.tagMgr.loadTaboolaPixels();
          wz.tagMgr.loadOpenWebScript();
          wz.tagMgr.loadGoogleAdsPixel();
          wz.tagMgr.loadGeminiPixels();
          wz.tagMgr.loadTiktokPixels();
          wz.tagMgr.loadTwitterPixels();

          wz.utils.checkFbCookies();
          wz.utils.checkGDNCookies();
      }, 2000);
  } catch (e) {
      wz.loggerMgr.error('EXCEPTION: wz.layoutMgr.init ' + e.message);
  }
};

wz.layoutMgr.handleWindowResize = function() {
    $(window).resize(function () {
        if ($('.menu-btn').is(":visible")) {
            if ($('#main_header nav').css('display') == 'inline-block') {
                $('#main_header nav').css('display', 'none');
            }
        } else {
            $('#main_header nav').css('display', 'inline-block');
        }
    });
};

wz.layoutMgr.onScreenLog = function(p1, p2 , p3 , p4) {
    wz.loggerMgr.log('[layoutMgr] ' + (p1 || ''), p2 || '', p3 || '', p4 || '');

    if (wz.config.template.wzdebug === 'onscreen') {
        // create log container
        if ($('#logContainer').length === 0) {
            $('body').append('<div id="logContainer" style="position:fixed; top:0; left:0; width:100%; height:300px; color:red; overflow: scroll; z-index: 999;"></div>');
        }

        $('#logContainer').prepend((p1 || '') + ' ' + (p2 || '') + ' ' + (p3 || '') + ' ' + (p4 || '') + '<br>');
    }
};

wz.layoutMgr.initLayoutInfinite = function () {
    wz.layoutMgr.initBottomStickyAd();
    wz.layoutMgr.initRightStickAds();

    wz.layoutMgr.initOneOnOneAd();
    wz.layoutMgr.initVideo();

    var $pages = $('.article-page');
    var customAdsLayout = wz.config.template.customAdsLayout || 'default';

    switch (customAdsLayout) {
        case 'desktopMultipleAds':
            wz.layoutMgr.desktopMultipleAds($pages);
            break;
        default:
            wz.layoutMgr.infiniteDefaultLayout($pages);
    }

    if (wz.config.template.showSmartFeed) {
        wz.tagMgr.loadNativeSmartFeed();
    }

    // Start Page Lazyload Listener:
    wz.lazyMgr.startLazyloadListener(wz.layoutMgr.scrollHandler);

    // refresh sticky ads every 30 seconds (if tab is active)
    wz.pbMgr.reset30secRefresh(wz.layoutMgr.refreshWrapper);
};

wz.layoutMgr.initBottomStickyAd = function () {
    if (wz.layoutMgr.stickyLoaded) {
        return;
    }

    if (wz.config.template.enableBottomStickyfromPage && wz.config.template.enableBottomStickyfromPage !== wz.config.template.currentPageNum) {
        return;
    }

    if (wz.config.template.disableBottomSticky) {
        return;
    }

    if (wz.config.template.noClickBottomSticky) {
        $('#bottom_sticky_ad').addClass('no_click_sticky');
    }

    switch(wz.config.template.device) {
        case 'phone':
            $('#bottom_sticky_ad').show();
            wz.pbMgr.duplicateAdSlot($('#sticky-ad-bottom'), wz.pbConfig.pbUnitIdx['D320x50_1']);
            $('#sticky-ad-bottom').attr('data-dfpsticky-id', wz.pbConfig.pbUnitIdx['D320x50_1']);
            break;
        case 'tablet':
            $('#bottom_sticky_ad').show();
            wz.pbMgr.duplicateAdSlot($('#sticky-ad-bottom'), wz.pbConfig.pbUnitIdx['D728x90_3']);
            $('#sticky-ad-bottom').attr('data-dfpsticky-id', wz.pbConfig.pbUnitIdx['D728x90_3']);
            break;
        case 'desktop':
            let defaultStickyLayout = wz.config.template.adStickySettings['default'];

            if (wz.config.template.layoutConfig !== 'infinite' && wz.config.template.adStickySettings[wz.config.template.currentPageNum]) {
                defaultStickyLayout = Object.assign(defaultStickyLayout, wz.config.template.adStickySettings[wz.config.template.currentPageNum]);
            }

            // Bottom Sticky
            const $bottomStickyAd = $('#sticky-ad-bottom');

            if (!defaultStickyLayout.disableBottomSticky) {
                // Sticky-Ad-Bottom:
                $('#bottom_sticky_ad').show();
                if ($bottomStickyAd.length > 0) {
                    wz.pbMgr.duplicateAdSlot($bottomStickyAd, wz.pbConfig.pbUnitIdx['D728x90_3']);
                    $bottomStickyAd.attr('data-dfpsticky-id', wz.pbConfig.pbUnitIdx['D728x90_3']);
                }
            }
            break;
    }

    wz.layoutMgr.stickyLoaded = true;
};

wz.layoutMgr.initRightStickAds = function () {
    wz.tagMgr.loadStickyScript();
    if (wz.config.template.disableRightStickyAds) {
        return;
    }

    if (wz.layoutMgr.rightStickyLoaded) {
        return;
    }

    if (wz.config.template.enableRightStickyfromPage && wz.config.template.enableRightStickyfromPage !== wz.config.template.currentPageNum) {
        return;
    }

    var defaultStickyLayout = wz.config.template.adStickySettings['default'];

    if (wz.config.template.layoutConfig !== 'infinite' && wz.config.template.adStickySettings[wz.config.template.currentPageNum]) {
        defaultStickyLayout = Object.assign(defaultStickyLayout, wz.config.template.adStickySettings[wz.config.template.currentPageNum]);
    }

    if (document.documentElement.clientWidth > 1100 ) {
        const $rightRailContainer = $('#right_rail .sticky_ad');

        // RightRail Ads
        $.each(defaultStickyLayout, function (ad) {
            if (ad.startsWith('rr') && defaultStickyLayout[ad]) {
                $rightRailContainer.find('#' + ad).find('.ad-label').show();
                $rightRailContainer.find('#' + ad).append("<div id='sticky-ad-right-" + ad + "' class='WzAdMgrAdUnit'></div>");
                wz.pbMgr.duplicateAdSlot($('#sticky-ad-right-' + ad), wz.pbConfig.pbUnitIdx[defaultStickyLayout[ad]]);
                $('#sticky-ad-right-' + ad).attr('data-dfpsticky-id', wz.pbConfig.pbUnitIdx[defaultStickyLayout[ad]]);
            }
        })
    }

    wz.layoutMgr.rightStickyLoaded = true;
};

wz.layoutMgr.initOneOnOneAd = function () {
    if (wz.config.template.disable1x1Ad && wz.config.template.disable1x1Ad === true) {
        return;
    }

    wz.pbMgr.duplicateAdSlot($('#one_on_one_ad'), wz.pbConfig.pbUnitIdx['D1x1_1']);
};

wz.layoutMgr.initVideo = function () {
    try {
        const { videoSettings } = wz.config.template;
        const screenWidth = window.innerWidth;
        const desktopShowOnWidth = videoSettings?.desktopShowOnWidth ?? 1250;
        const videoContainer = videoSettings?.containerId ?? 'mmvid';
        const showVideoFromPage = videoSettings?.showVideoFromPage ?? 1;
        const showVideoOnInfiniteLayout = videoSettings?.showVideoOnInfiniteLayout ?? 1;
        const videoPositionInPage = videoSettings?.videoPositionInPage ?? 'article_content_bottom';
        const $articlePage = $('.article-page');

        if (wz.config.template.layoutConfig === 'infinite') {
            $articlePage.filter(`[data-page-num="${showVideoOnInfiniteLayout}"]`).find('.article_content_bottom').append(`<div id="${videoContainer}"></div>`);
        } else if (wz.config.template.currentPageNum >= showVideoFromPage) {
            $articlePage.filter(`[style*='display: block']`).first().find(`.${videoPositionInPage}`).append(`<div id="${videoContainer}"></div>`);
        }

        switch(wz.config.template.device) {
            case 'phone':
            case 'tablet':
                if (videoSettings?.enabled) {
                    wz.tagMgr.loadVideo();
                }
                break;
            case 'desktop':
                if (videoSettings?.enabled && screenWidth > desktopShowOnWidth) {
                    wz.tagMgr.loadVideo();
                }
                break;
        }
    } catch (e) {
        wz.loggerMgr.error('initVideo:' + e.message);
    }
};

wz.layoutMgr.desktopMultipleAds = function ($pages) {
    const adsInfiniteLayout = wz.config.template.adSettingsInfiniteByPage['default'];
    const topAdUnit = adsInfiniteLayout['topAd'] || 'D728x90_1';
    const firstMultipleAdUnit = adsInfiniteLayout['firstMultipleAdUnit'] || 'D300x250_1';
    const secondMultipleAdUnit = adsInfiniteLayout['secondMultipleAdUnit'] || 'D300x250_1';

    for (let i = adsInfiniteLayout['startFromPage'] - 1; i < $pages.length; i++) {
        const pageNum = i + 1;
        const page = $($pages[i]);

        const topAdHTML = `<div class="slot-box-marker slot-box-marker-ad" data-slot-type="hb" data-hb-dup-id=${wz.pbConfig.pbUnitIdx[topAdUnit]} ></div>`;
        page.find('.article_content_top').append(topAdHTML);

        const showVideoFromPage = wz.config.template.videoSettings?.showVideoFromPage || 3;
        if (pageNum !== showVideoFromPage) {
            const multipleAdsHTML = '<div class="multiple-ads-container"></div>'
                + `<div class="slot-box-marker slot-box-marker-ad" data-slot-type="hb" data-hb-dup-id=${wz.pbConfig.pbUnitIdx[firstMultipleAdUnit]} ></div>`
                + `<div class="slot-box-marker slot-box-marker-ad" data-slot-type="hb" data-hb-dup-id=${wz.pbConfig.pbUnitIdx[secondMultipleAdUnit]} ></div>`;
            page.find('.article_content_bottom').append(multipleAdsHTML);
        }
    }

    if (wz.config.template.openwebSlots?.length > 0) {
        wz.layoutMgr.openwebMoreThanOne = true;
        wz.config.template.openwebSlots.split(',').forEach((slotNumber) => {
            $('.slot-box-marker-ad').eq(slotNumber).attr('data-slot-type', 'openweb');
        });
    }
};

wz.layoutMgr.infiniteDefaultLayout = function ($pages) {
    if (wz.config.template.disablePrebid) {
        return;
    }

    // Mark AdSlots
    wz.layoutMgr.words_counter = 0;
    $pages.each(function (pageNum) {
        wz.layoutMgr.injectContentSlots(pageNum, $(this), 'slot-box-marker slot-box-marker-ad', wz.layoutMgr.adslotWordGap);
    });

    // Cache frequently used values
    var recommendationsSlotEvery = wz.layoutMgr.recommendationsSlotEvery || 0;
    var device = wz.config.template.device;

    // Distribute Slot Elements For Type "AD":
    var adSlots = $(".slot-box-marker-ad");
    for (var i = 0; i < adSlots.length; i++) {
        var slot = adSlots.eq(i);
        var showRecommendations = (recommendationsSlotEvery && (i > 1) && (i % recommendationsSlotEvery) === 0);

        if (showRecommendations) {
            // recommendations (outbrain / taboola)
            slot.attr('data-slot-type', 'recommendations');
        } else {
            // hb
            slot.attr('data-slot-type', 'hb');
            var dupId = device === "phone" ? wz.pbConfig.pbUnitIdx['D300x250_12'] : wz.pbConfig.pbUnitIdx['D728x90_1'];
            slot.attr('data-hb-dup-id', dupId);
        }
    }

    if (wz.config.template.openwebSlots && wz.config.template.openwebSlots.length > 0) {
        wz.layoutMgr.openwebMoreThanOne = false;
        wz.config.template.openwebSlots.split(",").forEach(function (slotNumber) {
            adSlots.eq(slotNumber).attr('data-slot-type', 'openweb');
        });
    }
};

wz.layoutMgr.injectContentSlots = function (pageNum, $page, slotClass, wordsGap) {
    if (pageNum === 0 || (wz.config.template['skipTwoPages'] && pageNum === 1)) {
        return;
    }

    var elem_arr = $page.find("p, .image_container, h2, .instagram-media");
    var last_checked_p_index = 0;
    var words_counter = 0;

    for (var i = last_checked_p_index; i < elem_arr.length; i++) {
        var cur_elem = $(elem_arr[i]);
        var cur_elem_word_count = wz.layoutMgr.countWordsInP(cur_elem);

        if (cur_elem_word_count > 0) {
            words_counter += cur_elem_word_count;

            if (words_counter >= wordsGap) {
                wz.layoutMgr.insertSlotAfterElem(cur_elem, slotClass);
                words_counter = 0;
            }
        }
    }
};

wz.layoutMgr.countWordsInP = function (p) {
    if (p.is(".image_container") || p.is(".instagram-media")) return 90;

    var txt = $.trim(p.text());
    if (wz.layoutMgr.isSpaceOrEmpty(txt)) return 0;
    var arr = txt.split(/&nbsp;| /);
    return arr.length;
};

wz.layoutMgr.insertSlotAfterElem = function (elem, slotClass) {
    elem.after('<div class="' + slotClass + '"></div>');
};

wz.layoutMgr.isSpaceOrEmpty = function (txt) {
    return txt === "" || txt === " " || txt === "&nbsp;";
};

wz.layoutMgr.scrollHandler = function () {
    var maxLoads = 8;

    // handle lazy images:
    var viewGap = parseInt((window.innerHeight) / 2);
    var lazyPages = [].slice.call(document.querySelectorAll('div.article-page:not([data-lazy-loaded="true"])'));
    var pageLoadedCounter = 0;
    lazyPages.forEach(function (el) {
        if (wz.lazyMgr.isPartialElementInViewport(el, viewGap) && pageLoadedCounter < maxLoads) {
            pageLoadedCounter++;
            el.setAttribute('data-lazy-loaded', true);
            wz.layoutMgr.lazyLoadPageImage(el);
        }
    });

    if (pageLoadedCounter === maxLoads) {
        wz.loggerMgr.track('stats', 'tooManyPagesLoadedAtOnce');
    }

    // handle lazy load of slots:
    var slotLoadedCounter = 0;
    var lazySlots = [].slice.call(document.querySelectorAll('div.slot-box-marker:not([data-lazy-loaded="true"])'));
    lazySlots.forEach(function (el) {
        if (wz.lazyMgr.isPartialElementInViewport(el, wz.pbMgr.lazyViewportExpand) && slotLoadedCounter < maxLoads) {
            slotLoadedCounter++;
            el.setAttribute('data-lazy-loaded', true);
            wz.layoutMgr.lazyLoadSlot(el);

            wz.layoutMgr.removeOldAds();
        }
    });
};

wz.layoutMgr.lazyLoadSlot = function (el) {
    try {
        var $obj = $(el);
        switch ($obj.attr("data-slot-type")) {
            case 'hb':
                var unitIdx = $obj.attr("data-hb-dup-id");
                $obj.append('<div class="ad-label">ADVERTISEMENT</div>');
                wz.pbMgr.duplicateAdSlot($obj, unitIdx);
                break;
            case 'recommendations':
                wz.tagMgr.loadRecommendations($obj);
                break;
            case 'openweb':
                wz.tagMgr.loadOpenWebWidget($obj);
                break;
            default:
                wz.loggerMgr.error('unknown slot type');
        }
    } catch (e) {
        wz.loggerMgr.error('EXCEPTION: lazyLoadSlot: ' + e.message);
        wz.layoutMgr.onScreenLog('EXCEPTION: lazyLoadSlot', e);
    }
};

wz.layoutMgr.lazyLoadPageImage = function (el) {
    var $page = $(el);

    // Advance Page Url:
    var currPageNum = Number($page.attr('data-page-num'));
    wz.layoutMgr.onScreenLog('load page image', currPageNum);

    if (currPageNum > wz.layoutMgr.pageNumWatermark) {
        wz.layoutMgr.pageNumWatermark = currPageNum;

        // Change page url param
        wz.config.template.pageNum = wz.config.trackingChannel.funnel = wz.config.template.currentPageNum = currPageNum;

        // track pageView
        wz.layoutMgr.onScreenLog('track pageView');
        wz.layoutMgr.trackPageView();
        wz.layoutMgr.initBottomStickyAd();
        wz.layoutMgr.initRightStickAds();

        // update browser url
        if (wz.config.template.currentPageNum > 1) {
            try {
                var newUrl = window.location.href.split('&page=')[0] + '&page=' + wz.config.template.currentPageNum;
                window.history.replaceState({page: wz.config.template.currentPageNum}, null, newUrl);
                wz.layoutMgr.postPageEvent();
            } catch (e) {
                wz.loggerMgr.error('EXCEPTION: postPageEvent ' + ':' + e.message);
            }
        }

        // refresh sticky infinite rules
        if (wz.config.template.currentPageNum > 2 && wz.config.template.currentPageNum % 2 === 0) {
            wz.layoutMgr.refreshWrapper();
        }

        wz.tagMgr.loadSonobiPush();

        wz.utils.handleScrollPercentage();
        wz.utils.handleTimeOnPage();
    }
};

wz.layoutMgr.refreshWrapper = function() {
    var currentTime = new Date().getTime() / 1000;
    if (currentTime - wz.layoutMgr.lastTimeStickyRefreshed > 10) {
        wz.layoutMgr.refreshStickyAds();
        wz.layoutMgr.lastTimeStickyRefreshed = currentTime;
    }
};

wz.layoutMgr.refreshStickyAds = function () {
    if (wz.lazyMgr.isTabActive) {
        googletag.cmd.push(function () {
            try {
                wz.layoutMgr.onScreenLog('wz.layoutMgr.refreshStickyAds');
                $(".wzDfpAd:visible").each(function () {
                    var stickyUnitIdx = $(this).parents('.WzAdMgrAdUnit').attr("data-dfpsticky-id");
                    var divCode = $(this).attr('id');

                    if (stickyUnitIdx) {
                        wz.pbMgr.destroyAndDuplicateAd($(this).parents('.WzAdMgrAdUnit'), divCode, stickyUnitIdx);
                    }
                });
            } catch (e) {
                wz.loggerMgr.error('error: wz.layoutMgr.refreshStickyAds ' + e.message);
            }
        });
    }
};

wz.layoutMgr.removeOldAds = function () {
    // handle lazy load of slots:
    var divCode = '';
    googletag.cmd.push(function () {
        try {
            var lazySlots = [].slice.call(document.querySelectorAll('div.slot-box-marker[data-lazy-loaded="true"][data-slot-type="hb"]'));
            lazySlots.forEach(function (el) {
                var rect = el.getBoundingClientRect();
                if (rect.top < -1000) {
                    divCode = $(el).find('.wzDfpAd').attr('id');
                    wz.pbMgr.deletedSlots.push(divCode);
                    el.setAttribute('data-lazy-loaded', 'removed');
                    googletag.destroySlots([wz.pbMgr.dfpObjectIndex[divCode]]);
                    $(el).empty();
                    wz.loggerMgr.log('ad cleanup ' + divCode);
                }
            });
        } catch (e) {
            wz.loggerMgr.error('error ad cleanup: ' + divCode + "Error: " + e.message);
        }
    });
};

wz.layoutMgr.destroyAds = function (elementID) {
    var childrenID = $("#" + elementID).children('.WzAdMgrAdUnit').children().attr('id');
    wz.pbMgr.deletedSlots.push(childrenID);

    googletag.destroySlots([wz.pbMgr.dfpObjectIndex[childrenID]]);

    $('.' + childrenID).remove();
    $("#" + elementID).hide();

    setTimeout(function () {
        $("#" + elementID).show();
        wz.pbMgr.duplicateAdSlot($('#sticky-ad-bottom'), wz.pbConfig.pbUnitIdx['D728x90_3']);
        $('#sticky-ad-bottom').attr('data-dfpsticky-id', wz.pbConfig.pbUnitIdx['D728x90_3']);
    }, 30000);
};

// override this function for post page events, using wz.config.pageNum
// wz.layoutMgr.postPageEvent = function() {};
wz.layoutMgr.postPageEvent = wz.layoutMgr.postPageEvent || function () {
};

wz.layoutMgr.trackPageView = function() {
    try {
        wz.loggerMgr.track('activeSession', 'pageView', {c1: document.referrer});

        if (wz.config.template.currentPageNum && wz.config.template.currentPageNum > 1) {

            window._tfa = window._tfa || [];
            if (typeof window._tfa.push !== 'undefined') {
                window._tfa.push({notify: 'event', name: 'page_view', id: 1036720});
            }
        }

        if (wz.config.template.pageNum) {
            var fbTriggerPages = [20, 25, 30];
            if (fbTriggerPages.indexOf(wz.config.template.pageNum) > -1) {
                var fbEvent = wz.config.template.pageNum + 'PV';
                if (typeof fbq === "function") {
                    fbq('track', fbEvent);
                }
            }
        }

        if (wz.config.template.utm_source === 'gdn') {
            var gdnEvent = wz.pixelMgr.parseGDNEvent("page_" + wz.config.template.pageNum);
            if (typeof gtag === "function" && gdnEvent) {
                gtag('event', 'conversion', {'send_to': 'AW-647138062/' + gdnEvent});
            }
        }

        // Twitter PageView
        if (wz.config.template.utm_source === 'twitter' && typeof twq == "function" && wz.config.template.currentPageNum > 1) {
            twq('track','PageView');
        }
    } catch (e) {
        wz.loggerMgr.error('trackPageView: ' + e.message);
    }
};
// END layoutMgr

(function () {
    $.ajaxSetup({cache: true});
    window.debugInfo.loadConfigStatus = 'init';
    wz.loadMgr.initVars();

    wz.config.template['newSession'] = wz.loadMgr.isPaidSession();

    $.getScript(wz.config.template.overridePrebidUrl || 'https://cdn.wazimo.com/engine/common/WzMgr/js/prebid7.43.0.js', wz.loadMgr.loadIntentIQ);

    wz.loadMgr.initLogger();

    wz.tagMgr.loadGDPRScript();
    wz.tagMgr.loadCCPAScript();

    if (wz.config.template.didomiLoadsGpt) {
        $('head').append('<script type="didomi/javascript" data-vendor="didomi:google" async src="https://www.googletagservices.com/tag/js/gpt.js?o=didomi"></script>');
    } else {
        $.getScript('https://www.googletagservices.com/tag/js/gpt.js');
    }

    wz.pbMgr.init();
    wz.layoutMgr.init();

    wz.lazyMgr.isTabActive = true;
    $(window).on('blur', function() {
        wz.lazyMgr.isTabActive = false;
    });
    $(window).on('focus', function() {
        wz.lazyMgr.isTabActive = true;
    });
})();