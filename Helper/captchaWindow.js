let captchaWindow = null;

function setCaptchaWindow(window) {
    captchaWindow = window;
};

function fetchCaptchaWindow() {
    return captchaWindow;
};

export {
    setCaptchaWindow,
    fetchCaptchaWindow
};
