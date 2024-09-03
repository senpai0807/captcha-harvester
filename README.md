## Captcha Harvester For Electron
- Firstly, I want to shoutout for sashapisdets for open-sourcing this 6 years ago | https://github.com/sashapisdets/Captcha-Solver
- This harvester currently only supports V2 and I removed the logic to store the token and utilizing a captcha bank, I recommend integrating something to where you utilize the token right then and there

### Changes Made
- The changes I made were previously in the git above, it was statically set to Supreme and you'd have to integrate a bunch of conditions to handle multiple different sites, I've made it to where the site is handled by the sites.js
- I removed the use of express and utilized socket.io to integrate a communication process between the process and renderer to remove the use of a preload file
- Previously, it was infinitely looping captcha solves to where you solve continiously and push all tokens to a captchaBank, I've removed that and made it to where after the solve, it loads the captcha.html, which is basically what your harvester will display until a captcha is prompted

### How To Use
```
1. git clone https://github.com/senpai0807/captcha-harvester.git
2. cd captcha-harvester
3. npm install
4. npm start
```

- To prompt any captchas, refer to the test.js

### Contribution
- You are more than welcomed to fork this repo and integrate into your own projects, utilize it for personal usage, or use it as a reference for your own harvester(s). I simply created it to integrate into my own project + handle the changes made in the latest version of Electron
