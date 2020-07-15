document.getElementById('all').addEventListener('click', viewAll);
window.onload = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const title = urlParams.get('nolink');
    document.getElementById('title').innerHTML = title
        ? title + ' has no meeting link'
        : 'You have no meetings in the next hour!';
};

function viewAll() {
    chrome.runtime.openOptionsPage();
}
