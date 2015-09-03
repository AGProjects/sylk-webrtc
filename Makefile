
GULP = node_modules/.bin/gulp

.PHONY: all clean dev dist distclean watch

all: dist

dev: watch

deploy:
	echo date +"%Y-%m-%d_%H:%M:%S" > dist/.timestamp
	rsync -av --exclude .htaccess --delete dist/ agp@node10.dns-hosting.info:/var/www/webrtc/
	ssh agp@node10.dns-hosting.info 'sudo /root/sync-web-slaves.sh'

dist:
	$(GULP) build

clean:
	rm -rf dist

distclean: dist
	rm -rf node_modules src/bower_components src/js

watch:
	$(GULP) watch
