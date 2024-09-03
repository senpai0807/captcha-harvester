import io from 'socket.io-client';
const socket = io('http://localhost:4077');

async function sendTest() {
    const site = "http://www.google.com/recaptcha/api2/demo"
    const siteKey = "6Le-wvkSAAAAAPBMRTvw0Q4Muexq9bi0DJwx_mJ-";
    socket.emit('trigger-captcha', site, siteKey);
};

sendTest();