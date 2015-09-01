
GULP = node_modules/.bin/gulp

.PHONY: all clean dist distclean watch

all: watch

dist:
	$(GULP) build

clean:
	rm -rf dist

distclean:
	rm -rf dist node_modules src/bower_components src/js

watch:
	$(GULP) watch
