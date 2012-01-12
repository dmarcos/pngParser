SRC_DIR = src

build: $(SRC_FILES)
	cd $(SRC_DIR); node /usr/local/lib/node_modules/requirejs/bin/r.js -o name=pngParser optimize=none out=../pngParser.js baseUrl=.; cd - 

