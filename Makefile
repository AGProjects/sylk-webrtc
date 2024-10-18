
.PHONY: all clean deploy deploy-test deploy-osx deploy-win dist dist-dev distclean watch serve lint pkg-osx pkg-win pkg-linux app-run

all: dist

deploy: dist
	echo `date +"%Y-%m-%d_%H:%M:%S"` > dist/.timestamp
	rm -f dist/js/*.map
	rm -f dist/assets/styles/*.map
	rsync -av --exclude .htaccess --exclude .well-known --delete dist/ -e 'ssh -A -J agp@de-node02.dns-hosting.info:22' agp@10.208.118.4:/var/www/webrtc/
	ssh -A -J agp@de-node02.dns-hosting.info:22 agp@10.208.118.4 'sudo /root/sync-webrtc.sh'

deploy-test: dist-dev
	echo `date +"%Y-%m-%d_%H:%M:%S"` > dist/.timestamp
	rsync -av --exclude .htaccess --delete dist/ agp@node08.dns-hosting.info:/var/www/webrtc-test/

deploy-osx:
	rsync -avz --progress dist-electron/Sylk*.dmg dist-electron/Sylk*.zip dist-electron/latest-mac*yml -e 'ssh -A -J agp@de-node02.dns-hosting.info:22' agp@10.208.118.4:/var/www/download/Sylk/
	ssh -A -J agp@de-node02.dns-hosting.info:22 agp@10.208.118.4 ssh agp@node08.dns-hosting.info 'sudo /root/symlink-sylk.sh'
	rsync -avz --progress dist-electron/Sylk*.dmg dist-electron/Sylk*.zip dist-electron/latest-mac*yml -e 'ssh -A -J agp@ca-node02.dns-hosting.info:22' agp@10.208.120.103:/var/www/download/Sylk/
	ssh -A -J agp@ca-node02.dns-hosting.info:22 agp@10.208.120.103 'sudo /root/symlink-sylk.sh'

deploy-win:
	rsync -avz --progress dist-electron/Sylk*.exe dist-electron/latest.yml -e 'ssh -A -J agp@de-node02.dns-hosting.info:22' agp@10.208.118.4:/var/www/download/Sylk/
	ssh -A -J agp@de-node02.dns-hosting.info:22 agp@10.208.118.4 'sudo /root/symlink-sylk.sh'
	rsync -avz --progress dist-electron/Sylk*.exe dist-electron/latest.yml -e 'ssh -A -J agp@ca-node02.dns-hosting.info:22' agp@10.208.120.103:/var/www/download/Sylk/
	ssh -A -J agp@ca-node02.dns-hosting.info:22 agp@10.208.120.103 'sudo /root/symlink-sylk.sh'

deploy-linux:
	rsync -avz --progress dist-electron/Sylk*.AppImage dist-electron/latest-linux*yml -e 'ssh -A -J agp@de-node02.dns-hosting.info:22' agp@10.208.118.4:/var/www/download/Sylk/
	ssh -A -J agp@de-node02.dns-hosting.info:22 agp@10.208.118.4 'sudo /root/symlink-sylk.sh'
	rsync -avz --progress dist-electron/Sylk*.AppImage dist-electron/latest-linux*yml -e 'ssh -A -J agp@ca-node02.dns-hosting.info:22' agp@10.208.120.103:/var/www/download/Sylk/
	ssh -A -J agp@ca-node02.dns-hosting.info:22 agp@10.208.120.103 'sudo /root/symlink-sylk.sh'

dist:
	npm run build

dist-dev:
	npm run build-dev

clean:
	rm -rf dist dist-electron app/www

distclean: clean
	rm -rf node_modules app/node_modules

watch:
	npm run dev

serve:
	npm run serve

lint:
	npm run lint

electron:
	# TODO: use a different gulp task which doesn't browserify
	npm run electron

pkg-osx: electron
	npm run build-osx

pkg-win: electron
	npm run build-win

pkg-linux: electron
	npm run build-linux

app-run: electron
	npm start
