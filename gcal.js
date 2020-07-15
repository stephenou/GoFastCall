const REGEX = /((?:https?:\/\/)(?:(?:(?:\w+\.)?zoom\.us)|(?:hangouts\.google.com)|(?:meet\.google.com)|(?:teams\.microsoft.com)|(?:(?:\w+\.)?gotomeeting.com|(?:(?:\w+\.)?gotomeet.me))|(?:(?:\w+\.)?chime.aws)|(?:(?:\w+\.)?bluejeans.com)|(?:(?:\w+\.)?webex.com)|(?:(?:\w+\.)?whereby.com))[A-Za-z0-9~#=_\-\/\?]*)/;

function getDate(data) {
    if (data.dateTime) {
        return new Date(data.dateTime);
    }
    return undefined;
}

function login(interactive = false) {
    return new Promise((resolve, reject) => {
        gapi.load('client:auth2', () => {
            gapi.client.load('calendar', 'v3', () => {
                chrome.identity.getAuthToken({ interactive }, token => {
                    if (!token) {
                        reject();
                    } else {
                        gapi.client.setToken({ access_token: token });
                        resolve(token);
                    }
                });
            });
        });
    });
}

function loadEvents() {
    return gapi.client.calendar.events
        .list({
            calendarId: 'primary',
            timeMin: new Date().toISOString(),
            showDeleted: false,
            singleEvents: true,
            maxResults: 10,
            orderBy: 'startTime',
        })
        .then(response => {
            return response.result.items.map(item => ({
                summary: item.summary || '',
                location: item.location || '',
                description: item.description || '',
                hangoutLink: item.hangoutLink || '',
                start: item.start,
                end: item.end,
            }));
        })
        .then(events => {
            return events
                .map(event => {
                    const start = getDate(event.start);
                    const end = getDate(event.end);
                    if (!start || !end) return undefined;
                    const descriptionMatch = event.description.match(REGEX);
                    const locationMatch = event.location.match(REGEX);
                    const summaryMatch = event.summary.match(REGEX);
                    let url;
                    if (event.hangoutLink) url = event.hangoutLink;
                    else if (descriptionMatch) url = descriptionMatch[1];
                    else if (locationMatch) url = locationMatch[1];
                    else if (summaryMatch) url = summaryMatch[1];
                    return {
                        ...event,
                        start,
                        end,
                        url,
                    };
                })
                .filter(event => Boolean(event));
        });
}
