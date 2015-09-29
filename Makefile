
GULP = node_modules/.bin/gulp

.PHONY: all clean deploy deploy-test dist dist-dev distclean watch

all: dist

deploy: dist
	echo `date +"%Y-%m-%d_%H:%M:%S"` > dist/.timestamp
	rm -f dist/js/*.map
	rsync -av --delete dist/ agp@node10.dns-hosting.info:/var/www/webrtc/
	ssh agp@node10.dns-hosting.info 'sudo /root/sync-webrtc.sh'

deploy-test: dist-dev
	echo `date +"%Y-%m-%d_%H:%M:%S"` > dist/.timestamp
	rsync -av --exclude .htaccess --delete dist/ agp@node10.dns-hosting.info:/var/www/webrtc-test/

dist:
	$(GULP) build

dist-dev:
	$(GULP) build --type dev

clean:
	rm -rf dist src/js

distclean: clean
	rm -rf node_modules src/bower_components

watch:
	$(GULP) watch
