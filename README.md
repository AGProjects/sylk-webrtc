
# Sylk

Sylk WebRTC Client, focused on multiparty conferencing, is the companion
client for SylkServer.

Sylk is built using HTML and JavaScript and uses the
[SylkRTC](https://github.com/AGProjects/sylkrtc.js) API to talk to
SylkServer.  It can be served as a web page using the web server of your
choice, or it can be packaged as a stand alone desktop application using
Electron.  This repository contains the code to build the website and a
companion [Electron](http://electron.atom.io) app.

## Features

* Multimedia calling with SIP interoperability
* Screen sharing for both one-to-one or multi-party
* Multi-party conferencing (WebRTC only)
* File sharing in WebRTC conferences
* End-to-end encrypted chat sessions
* End-to-end encrypted file transfers
* Guest mode (no account required when invited)

## Customization

Sylk WebRTC Client is preconfigured to use with the free service SIP2SIP.

The default settings of the app are found in `src/app/config.js`.

If you wish to use the client together with another instance of SylkServer,
you must edit `src/app/config.js`.

The keys in config.js have the following functions:

* publicUrl - the Web URL where Sylk clients or Web browsers connect to SylkServer
* enrollmentUrl - a Web URL where accounts can be created by the Sylk client.
The account creation is realized by a POST request containing the following
data: username, email, password, display_name. For a complete server-side
example of handling such request see [createAccount function](https://github.com/AGProjects/cdrtool/blob/master/library/sip_settings.php#L11891)
* serverCallHistoryUrl - a Web URL from where the last calls can be retrieved from by Sylk clients
For a complete server-side example of handling such request see [sipSettings page](https://github.com/AGProjects/cdrtool/blob/master/library/sip_settings.php)
* defaultConferenceDomain - all configured Sylk clients must share the same domain
* downloadUrl - a Web URL where Sylk client can be downloaded from, shown when the web page is used to access SylkServer

## Development

Node.js is needed for development.  Version >= 10.0 is recommended.  For
convenience the `configure` script and `Makefile`  are provided.

Node.js can be downloaded from https://nodejs.org

yarn must be used to install dependencies, it can be installed as
follows:

```
npm install -g yarn
```

NOTE: depending on your Node installation you might need to use `sudo`.

* Install all dependencies

```
    ./configure
```

For Windows build:

```
    brew cask install xquartz
    brew install wine
```


### Website

* Build the ready to be deployed distribution (available in dist/)

```
    make
```

* Development build, starts a test webserver which auto-reloads as the code changes

```
    make watch
```

* Deploy the built website to the default server (SIP2SIP.info)

```
    make deploy
```

* Deploy the built website to the default staging server (SIP2SIP.info)

```
    make deploy-test
```

To deploy the built website to your own web server, copy the contents of the
dist/ folder to the location on de website where you want it to be
available. See examples/apache/.htaccess for required rewrite rules.

### Electron application

The version number can be set in app/package.json

* Build the Electron application

```
    make electron
```

* Build and run Electron application:

```
    make app-run
```

* Build macOS DMG package. To publish a DMG outside the app store the
  applications needs to be notarized. If you have a .env file containing your
  appleid and password, it will attempt to notarize the app. You should
  generate an app-specific password for this. The file should look like:

```
APPLE_ID=YOUR_APPLE_ID
APPLE_ID_PASSWORD=YOUR_CUSTOM_PASSOWRD_FOR_THE_APP
```

```
    make pkg-osx
```

* Build Windows NSIS based installer (universal: 32 and 64 bits)

```
    make pkg-win
```

NOTE: If building on macOS Wine must be installed with `brew install wine`.

* Build Linux AppImage (both 32 and 64 bit builds)

```
    make pkg-linux
```

NOTE: Requires a GNU/Linux system with the following packages installed: icnsutils, graphicsmagick


### Common

* Clean the distribution

```
    make clean
```

* Clean all installed packages and generated files

```
    make distclean
```


## Debugging

By default Sylk doesn't output a lot of information to the browser's
JavaScript console.  Console debug messages are namespaced by library, the
two most important ones being 'sylkrtc' and 'blinkrtc'.  In order to enable
debugging for both open the browser's JavaScript console and type the
following:

```
    window.blinkDebugger.enable('sylkrtc*,blinkrtc*');
```

Then reload the page. Debug messages will be logged to the console now.

Electron app debug can be enabled from Debug/Open DevTools menu.


## License

Sylk is available under the AGPLv3 license. See the LICENSE file.


## Authors

* Tijmen de Mes ([@tijmenNL](https://github.com/tijmenNL))
* Saúl Ibarra Corretgé ([@saghul](https://github.com/saghul))


## Credits

The following organizations have helped the development of Sylk by providing funding:

* [NLnet Foundation](https://www.nlnet.nl)
* [ISOC Nederland](https://www.isoc.nl)
* [SIDNfonds](https://www.sidnfonds.nl)
