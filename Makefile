
GULP = node_modules/.bin/gulp

.PHONY: all clean distclean watch

all:
	$(GULP) build

clean:
	rm -rf dist

distclean:
	rm -rf dist node_modules src/bower_components src/js

watch:
	$(GULP) watch
