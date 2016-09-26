
# Sylk

Sylk is a WebRTC client, from the authors of [Blink](http://icanblink.com).
It's built using HTML and JavaScript and uses the [SylkRTC](https://github.com/AGProjects/sylkrtc.js) API.

## Features

* Audio / video calling
* SIP interoperability
* Multi-party video conferencing
* Guest mode (no account required if invited)


## Development

Nodejs is needed for development. Version >= 4.2 is recommended. A convenience
`configure` script and `Makefile` are provided.

* Install all dependencies


    ./configure


* Build the ready to be deployed distribution (available in dist/)


    make


* Development build, starts a test webserver which auto-reloads as the code changes


    make watch


* Clean the distribution


    make clean


* Clean all installed packages and generated files


    make distclean


* Deploy the built website to the server


    make deploy


* Deploy the built website to the staging server


    make deploy-test


## Debugging

By default Sylk doesn't output a lot of information to the browser's JavaScript console.
Console debug messages are namespaced by library, the two most important ones being 'sylkrtc' and 'blinkrtc'.
In order to enable debugging for both open the browser's JavaScript console and type the following:

    window.blinkDebugger.enable('sylkrtc*,blinkrtc*');

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
