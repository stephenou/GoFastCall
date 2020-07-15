const loggedOutDiv = document.getElementById('logged_out');
const loggedInDiv = document.getElementById('logged_in');
const connectButton = document.getElementById('connect');
const disconnectButton = document.getElementById('disconnect');
const refreshButton = document.getElementById('refresh');

connectButton.onclick = connect;
disconnectButton.onclick = disconnect;
refreshButton.onclick = refresh;

const script = document.createElement('script');
script.src = 'https://apis.google.com/js/api.js?onload=init';
document.documentElement.appendChild(script);

function init() {
    login(false)
        .then(token => {
            load();
            showLoggedOut();
        })
        .catch(() => {
            showLoggedIn();
        });
}

function showLoggedOut() {
    loggedOutDiv.style.display = 'none';
    loggedInDiv.style.display = 'inline';
}

function showLoggedIn() {
    loggedOutDiv.style.display = 'inline';
    loggedInDiv.style.display = 'none';
}

function updateActionButton() {
    chrome.runtime.sendMessage({ command: 'update' });
}

function load() {
    loadEvents().then(events => {
        display(events);
        showLoggedOut();
    });
}

function connect() {
    login(true)
        .then(() => load())
        .then(() => updateActionButton())
        .catch(() => {});
}

function disconnect() {
    chrome.identity.getAuthToken({ interactive: false }, token => {
        if (token) {
            const url =
                'https://accounts.google.com/o/oauth2/revoke?token=' + token;
            fetch(url).then(() => {
                chrome.identity.removeCachedAuthToken({ token: token }, () => {
                    display(undefined);
                    showLoggedIn();
                    updateActionButton();
                });
            });
        }
    });
}

function refresh() {
    display(undefined);
    load();
    updateActionButton();
}

function display(events) {
    let html = '';
    if (events != null) {
        if (!events.length) {
            html = '<h3>No meetings found</h3>';
        } else {
            const count = Math.min(events.length, 10);
            for (let i = 0; i < count; i++) {
                const event = events[i];
                const title = event.url
                    ? '<a target="_blank" href="' +
                      event.url +
                      '">' +
                      event.summary +
                      '</a>'
                    : event.summary;
                html +=
                    '<div class="tr"><div class="th">' +
                    event.start.toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                    }) +
                    '</div><div class="td">' +
                    title +
                    '</div></div>';
            }
            html =
                '<div><h4>Upcoming meetings</h4><div class="table">' +
                html +
                '</div></div>';
        }
    }
    document.getElementById('meetings').innerHTML = html;
    document.getElementById('meetings').style.display = 'block';
}
