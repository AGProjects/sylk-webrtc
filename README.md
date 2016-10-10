
# Sylk

Sylk is a WebRTC client, from the authors of [Blink](http://icanblink.com).
It's built using HTML and JavaScript and uses the [SylkRTC](https://github.com/AGProjects/sylkrtc.js) API.

This repository contains the code to build the website and a companion [Electron](http://electron.atom.io)
app.

## Features

* Audio / video calling with SIP interoperability
* Multi-party video conferencing (WebRTC only)
* Guest mode (no account required if invited)

## Customization

The default settings of the app are found in src/app/config.js

## Development

Nodejs is needed for development.  Version >= 4.2 is recommended.  A
convenience `configure` script and `Makefile` are provided.

Nodejs can be downloaded from https://nodejs.org

After installation upgrade npm to version > 3.0:

```
npm install -g npm
```

NOTE: depending on your Node installation you might need to use `sudo`.

* Install all dependencies

```
    ./configure
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

* Deploy the built website to the server

```
    make deploy
```

* Deploy the built website to the staging server

```
    make deploy-test
```

### Electron application

* Build the Electron application

```
    make electron
```

* Build and run Electron application:

```
    make app-run
```

* Build macOS DMG package

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

NOTE: Requires a GNU/Linux system.


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

By default Sylk doesn't output a lot of information to the browser's JavaScript console.
Console debug messages are namespaced by library, the two most important ones being 'sylkrtc' and 'blinkrtc'.
In order to enable debugging for both open the browser's JavaScript console and type the following:

```
    window.blinkDebugger.enable('sylkrtc*,blinkrtc*');
```

Then reload the page. Debug messages will be logged to the console now.


## License

Sylk is available under the AGPLv3 license. See the LICENSE file.


## Authors

* Saúl Ibarra Corretgé ([@saghul](https://github.com/saghul))
* Tijmen de Mes ([@tijmenNL](https://github.com/tijmenNL))


## Credits

The following organizations have helped the development of Sylk by providing funding:

* [NLnet Foundation](https://www.nlnet.nl)
* [SIDNfonds](https://www.sidnfonds.nl)
