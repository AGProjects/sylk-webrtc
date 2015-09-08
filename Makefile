
GULP = node_modules/.bin/gulp

.PHONY: all clean dev deploy deploy-test dist distclean watch

all: dist

dev: watch

deploy: dist
	echo `date +"%Y-%m-%d_%H:%M:%S"` > dist/.timestamp
	rsync -av --delete dist/ agp@node10.dns-hosting.info:/var/www/webrtc/
	ssh agp@node10.dns-hosting.info 'sudo /root/sync-webrtc.sh'

deploy-test: dist
	echo `date +"%Y-%m-%d_%H:%M:%S"` > dist/.timestamp
	rsync -av --exclude .htaccess --delete dist/ agp@node10.dns-hosting.info:/var/www/webrtc-test/

dist:
	$(GULP) build

clean:
	rm -rf dist src/js

distclean: dist
	rm -rf node_modules src/bower_components

watch:
	$(GULP) watch
