
GULP = node_modules/.bin/gulp

.PHONY: all clean dev dist distclean watch

all: dist

dev: watch

dist:
	$(GULP) build

clean:
	rm -rf dist

distclean: dist
	rm -rf node_modules src/bower_components src/js

watch:
	$(GULP) watch
