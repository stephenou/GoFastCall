let currentEvent;
let loggedIn = false;
let pollingTimeoutId;
let refreshTimeoutId;
const POLLING_INTERVAL = 15 * 60 * 1000;

const script = document.createElement('script');
script.src = 'https://apis.google.com/js/api.js';
document.documentElement.appendChild(script);

function getEvent(unsortedEvents) {
    const events = [...unsortedEvents].sort((a, b) => {
        const now = new Date();
        const aDelta = Math.abs(a.start - now);
        const bDelta = Math.abs(b.start - now);
        if (aDelta < bDelta) return -1;
        return 1;
    });
    for (let i = 0; i < events.length; i++) {
        const event = events[i];
        const future = new Date();
        future.setTime(future.getTime() + 1000 * 60 * 60);
        if (future < event.start) continue;
        return {
            url: event.url,
            start: event.start,
            startString: event.start.toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit',
            }),
            title: event.summary,
        };
    }
    return undefined;
}

function refresh() {
    if (refreshTimeoutId) clearTimeout(refreshTimeoutId);
    const wait = (60 - new Date().getSeconds()) * 1000;
    refreshTimeoutId = setTimeout(refresh, wait);
    let badgeText, titleText;
    chrome.browserAction.setPopup({
        popup: '',
    });
    if (!currentEvent) {
        chrome.browserAction.setPopup({ popup: 'popup.html' });
        badgeText = '';
        titleText = 'GoFastCall - no meeting in the next hour!';
    } else if (!currentEvent.url) {
        chrome.browserAction.setPopup({
            popup: 'popup.html?nolink=' + currentEvent.title,
        });
        badgeText = '';
        titleText =
            'GoFastCall - ' + currentEvent.title + ' has no meeting link';
    } else {
        const now = new Date();
        const delta = (currentEvent.start - now) / 1000;
        const minutes = delta / 60;
        if (minutes < 0) {
            badgeText = 'now';
            titleText =
                'GoFastCall - join ' +
                currentEvent.title +
                ' (' +
                currentEvent.startString +
                ')';
        } else {
            if (minutes <= 10) {
                badgeText = String(Math.ceil(minutes)) + 'm';
            } else {
                badgeText = '';
            }
            titleText =
                'GoFastCall - join ' +
                currentEvent.title +
                ' (' +
                currentEvent.startString +
                ')';
        }
    }
    chrome.browserAction.setBadgeText({
        text: badgeText,
    });
    chrome.browserAction.setTitle({ title: titleText });
}

function poll() {
    login(false)
        .then(() => {
            loggedIn = true;
            if (pollingTimeoutId) clearTimeout(pollingTimeoutId);
            pollingTimeoutId = setTimeout(poll, POLLING_INTERVAL);
            return loadEvents().then(events => {
                currentEvent = getEvent(events);
                refresh();
            });
        })
        .catch(() => {
            loggedIn = false;
            if (pollingTimeoutId) clearTimeout(pollingTimeoutId);
            chrome.browserAction.setPopup({
                popup: '',
            });
            chrome.browserAction.setBadgeText({
                text: '',
            });
            chrome.browserAction.setTitle({
                title: 'Click to connect to Google Calendar',
            });
            currentEvent = undefined;
        });
}

chrome.runtime.onInstalled.addListener(function(object) {
    if (chrome.runtime.OnInstalledReason.INSTALL === object.reason) {
        chrome.tabs.create({ url: 'options.html' });
    }
    poll();
    chrome.browserAction.onClicked.addListener(function(activeTab) {
        if (currentEvent && currentEvent.url) {
            chrome.tabs.create({ url: currentEvent.url });
        } else if (!loggedIn) {
            chrome.tabs.create({ url: 'options.html' });
        }
    });
});

chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
    if (request.command === 'update') {
        poll();
    }
});
