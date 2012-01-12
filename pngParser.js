
//
// jDataView by Vjeux - Jan 2010
//
// A unique way to read a binary file in the browser
// http://github.com/vjeux/jsDataView
// http://blog.vjeux.com/ <vjeuxx@gmail.com>
// 

define('jdataview',[],function () {

  var compatibility = {
    ArrayBuffer: typeof ArrayBuffer !== 'undefined',
    DataView: typeof DataView !== 'undefined' && 'getFloat64' in DataView.prototype
  }

  var jDataView = function (buffer, byteOffset, byteLength, littleEndian) {
    this._buffer = buffer;

    // Handle Type Errors
    if (!(compatibility.ArrayBuffer && buffer instanceof ArrayBuffer) &&
      !(typeof buffer === 'string')) {
      throw new TypeError("Type error");
    }

    // Check parameters and existing functionnalities
    this._isArrayBuffer = compatibility.ArrayBuffer && buffer instanceof ArrayBuffer;
    this._isDataView = compatibility.DataView && this._isArrayBuffer;

    // Default Values
    this._littleEndian = littleEndian === undefined ? false : littleEndian;

    var bufferLength = this._isArrayBuffer ? buffer.byteLength : buffer.length;
    if (byteOffset == undefined) {
      byteOffset = 0;
    }

    if (byteLength == undefined) {
      byteLength = bufferLength - byteOffset;
    }

    if (!this._isDataView) {
      // Do additional checks to simulate DataView
      if (typeof byteOffset !== 'number') {
        throw new TypeError("Type error");
      }
      if (typeof byteLength !== 'number') {
        throw new TypeError("Type error");
      }
      if (typeof byteOffset < 0) {
        throw new Error("INDEX_SIZE_ERR: DOM Exception 1");
      }
      if (typeof byteLength < 0) {
        throw new Error("INDEX_SIZE_ERR: DOM Exception 1");
      }
    }

    // Instanciate
    if (this._isDataView) {
      this._view = new DataView(buffer, byteOffset, byteLength);
      this._start = 0;
    }
    this._start = byteOffset;
    if (byteOffset >= bufferLength) {
      throw new Error("INDEX_SIZE_ERR: DOM Exception 1");
    }

    this._offset = 0;
    this.length = byteLength;
  };

  jDataView.createBuffer = function () {
    if (typeof ArrayBuffer !== 'undefined') {
      var buffer = new ArrayBuffer(arguments.length);
      var view = new Int8Array(buffer);
      for (var i = 0; i < arguments.length; ++i) {
        view[i] = arguments[i];
      }
      return buffer;
    }

    return String.fromCharCode.apply(null, arguments);
  };

  jDataView.prototype = {

    // Helpers

    getString: function (length, byteOffset) {
      var value;

      // Handle the lack of byteOffset
      if (byteOffset === undefined) {
        byteOffset = this._offset;
      }

      // Error Checking
      if (typeof byteOffset !== 'number') {
        throw new TypeError("Type error");
      }
      if (length < 0 || byteOffset + length > this.length) {
        throw new Error("INDEX_SIZE_ERR: DOM Exception 1");
      }

      if (this._isArrayBuffer) {
        // Use Int8Array and String.fromCharCode to extract a string
        var int8array = new Int8Array(this._buffer, this._start + byteOffset, length);
        var stringarray = [];
        for (var i = 0; i < length; ++i) {
          stringarray[i] = int8array[i];
        }
        value = String.fromCharCode.apply(null, stringarray);
      } else {
        value = this._buffer.substr(this._start + byteOffset, length);
      }

      this._offset = byteOffset + length;
      return value;
    },

    getChar: function (byteOffset) {
      var value, size = 1;

      // Handle the lack of byteOffset
      if (byteOffset === undefined) {
        byteOffset = this._offset;
      }

      if (this._isArrayBuffer) {
        // Use Int8Array and String.fromCharCode to extract a string
        value = String.fromCharCode(this.getUint8(byteOffset));
      } else {
        // Error Checking
        if (typeof byteOffset !== 'number') {
          throw new TypeError("Type error");
        }
        if (byteOffset + size > this.length) {
          throw new Error("INDEX_SIZE_ERR: DOM Exception 1");
        }

        value = this._buffer.charAt(this._start + byteOffset);
        this._offset = byteOffset + size;
      }

      return value;
    },

    tell: function () {
      return this._offset;
    },
    
    seek: function (byteOffset) {
      if (typeof byteOffset !== 'number') {
        throw new TypeError("Type error");
      }
      if (byteOffset < 0 || byteOffset > this.length) {
        throw new Error("INDEX_SIZE_ERR: DOM Exception 1");
      }

      this._offset = byteOffset;
    },

    // Compatibility functions on a String Buffer

    _endianness: function (offset, pos, max, littleEndian) {
      return offset + (littleEndian ? max - pos - 1 : pos);
    },

    _getFloat64: function (offset, littleEndian) {
      var b0 = this._getUint8(this._endianness(offset, 0, 8, littleEndian)),
        b1 = this._getUint8(this._endianness(offset, 1, 8, littleEndian)),
        b2 = this._getUint8(this._endianness(offset, 2, 8, littleEndian)),
        b3 = this._getUint8(this._endianness(offset, 3, 8, littleEndian)),
        b4 = this._getUint8(this._endianness(offset, 4, 8, littleEndian)),
        b5 = this._getUint8(this._endianness(offset, 5, 8, littleEndian)),
        b6 = this._getUint8(this._endianness(offset, 6, 8, littleEndian)),
        b7 = this._getUint8(this._endianness(offset, 7, 8, littleEndian)),

        sign = 1 - (2 * (b0 >> 7)),
        exponent = ((((b0 << 1) & 0xff) << 3) | (b1 >> 4)) - (Math.pow(2, 10) - 1),

      // Binary operators such as | and << operate on 32 bit values, using + and Math.pow(2) instead
        mantissa = ((b1 & 0x0f) * Math.pow(2, 48)) + (b2 * Math.pow(2, 40)) + (b3 * Math.pow(2, 32))
            + (b4 * Math.pow(2, 24)) + (b5 * Math.pow(2, 16)) + (b6 * Math.pow(2, 8)) + b7;

      if (mantissa == 0 && exponent == -(Math.pow(2, 10) - 1)) {
        return 0.0;
      }

      if (exponent == -1023) { // Denormalized
        return sign * mantissa * Math.pow(2, -1022 - 52);
      }

      return sign * (1 + mantissa * Math.pow(2, -52)) * Math.pow(2, exponent);
    },

    _getFloat32: function (offset, littleEndian) {
      var b0 = this._getUint8(this._endianness(offset, 0, 4, littleEndian)),
        b1 = this._getUint8(this._endianness(offset, 1, 4, littleEndian)),
        b2 = this._getUint8(this._endianness(offset, 2, 4, littleEndian)),
        b3 = this._getUint8(this._endianness(offset, 3, 4, littleEndian)),

        sign = 1 - (2 * (b0 >> 7)),
        exponent = (((b0 << 1) & 0xff) | (b1 >> 7)) - 127,
        mantissa = ((b1 & 0x7f) << 16) | (b2 << 8) | b3;

      if (mantissa == 0 && exponent == -127) {
        return 0.0;
      }

      if (exponent == -127) { // Denormalized
        return sign * mantissa * Math.pow(2, -126 - 23);
      }

      return sign * (1 + mantissa * Math.pow(2, -23)) * Math.pow(2, exponent);
    },

    _getInt32: function (offset, littleEndian) {
      var b = this._getUint32(offset, littleEndian);
      return b > Math.pow(2, 31) - 1 ? b - Math.pow(2, 32) : b;
    },

    _getUint32: function (offset, littleEndian) {
      var b3 = this._getUint8(this._endianness(offset, 0, 4, littleEndian)),
        b2 = this._getUint8(this._endianness(offset, 1, 4, littleEndian)),
        b1 = this._getUint8(this._endianness(offset, 2, 4, littleEndian)),
        b0 = this._getUint8(this._endianness(offset, 3, 4, littleEndian));

      return (b3 * Math.pow(2, 24)) + (b2 << 16) + (b1 << 8) + b0;
    },

    _getInt16: function (offset, littleEndian) {
      var b = this._getUint16(offset, littleEndian);
      return b > Math.pow(2, 15) - 1 ? b - Math.pow(2, 16) : b;
    },

    _getUint16: function (offset, littleEndian) {
      var b1 = this._getUint8(this._endianness(offset, 0, 2, littleEndian)),
        b0 = this._getUint8(this._endianness(offset, 1, 2, littleEndian));

      return (b1 << 8) + b0;
    },

    _getInt8: function (offset) {
      var b = this._getUint8(offset);
      return b > Math.pow(2, 7) - 1 ? b - Math.pow(2, 8) : b;
    },

    _getUint8: function (offset) {
      if (this._isArrayBuffer) {
        return new Uint8Array(this._buffer, this._start + offset, 1)[0];
      } else {
        return this._buffer.charCodeAt(this._start + offset) & 0xff;
      }
    }
  };

  // Create wrappers

  var dataTypes = {
    'Int8': 1,
    'Int16': 2,
    'Int32': 4,
    'Uint8': 1,
    'Uint16': 2,
    'Uint32': 4,
    'Float32': 4,
    'Float64': 8
  };

  for (var type in dataTypes) {
    // Bind the variable type
    (function (type) {
      var size = dataTypes[type];

      // Create the function
      jDataView.prototype['get' + type] = 
        function (byteOffset, littleEndian) {
          var value;

          // Handle the lack of endianness
          if (littleEndian == undefined) {
            littleEndian = this._littleEndian;
          }

          // Handle the lack of byteOffset
          if (byteOffset === undefined) {
            byteOffset = this._offset;
          }

          // Dispatch on the good method
          if (this._isDataView) {
            // DataView: we use the direct method
            value = this._view['get' + type](byteOffset, littleEndian);
          }
          // ArrayBuffer: we use a typed array of size 1 if the alignment is good
          // ArrayBuffer does not support endianess flag (for size > 1)
          else if (this._isArrayBuffer && byteOffset % size == 0 && (size == 1 || littleEndian)) {
            value = new self[type + 'Array'](this._buffer, byteOffset, 1)[0];
          }
          else {
            // Error Checking
            if (typeof byteOffset !== 'number') {
              throw new TypeError("Type error");
            }
            if (byteOffset + size > this.length) {
              throw new Error("INDEX_SIZE_ERR: DOM Exception 1");
            }
            value = this['_get' + type](this._start + byteOffset, littleEndian);
          }

          // Move the internal offset forward
          this._offset = byteOffset + size;

          return value;
        };
    })(type);
  }

  self.jDataView = jDataView;

  return jDataView;

});
/*
Copyright (c) 2008 notmasteryet

Permission is hereby granted, free of charge, to any person
obtaining a copy of this software and associated documentation
files (the "Software"), to deal in the Software without
restriction, including without limitation the rights to use,
copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the
Software is furnished to do so, subject to the following
conditions:

The above copyright notice and this permission notice shall be
included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND,
EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES
OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT
HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY,
WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR
OTHER DEALINGS IN THE SOFTWARE.
*/

define('deflateOld',[],function() {

  /* inflate stuff - RFC 1950 */
  var staticCodes, staticDistances;
  var encodedLengthStart = new Array(3,4,5,6,7,8,9,10,
    11,13,15,17,19,23,27,31,35,43,51,59,67,83,99,
    115,131,163,195,227,258);
        
  var encodedLengthAdditionalBits = new Array(0,0,0,0,0,0,0,0,
    1,1,1,1,2,2,2,2,3,3,3,3,4,4,4,4,5,5,5,5,0);

  var encodedDistanceStart = new Array(1,2,3,4, 5,7,9,
    13,17,25, 33,49,65, 97,129,193,257,385,513,769,1025,1537,2049,
    3073,4097,6145,8193,12289,16385,24577);

  var encodedDistanceAdditionalBits = new Array(0,0,0,0,1,1,2,2,3,3,4,4,
    5,5,6,6,7,7,8,8,9,9,10,10,11,11,12,12,13,13);

  var clenMap = new Array(16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15);

  var BitReader = function(reader){
    this.bitsLength = 0;
    this.bits = 0;
    this.reader = reader;
    this.readBit = function() {
      if(this.bitsLength == 0) {
        var nextByte = this.reader.readByte();
        if(nextByte < 0) throw new "Unexpected end of stream";
        this.bits = nextByte;
        this.bitsLength = 8;
      }            
      var bit = (this.bits & 1) != 0;
      this.bits >>= 1;
      --this.bitsLength;
      return bit;
    };
    this.align = function() { this.bitsLength = 0; };
    this.readLSB = function(length) {
      var data = 0;
      for (var i=0;i<length;++i) {
        if(this.readBit()) data |= 1 << i;
      }
      return data;
    };
    this.readMSB = function(length) {
      var data = 0;
      for(var i=0;i<length;++i) {                 
        if(this.readBit()) data = (data << 1) | 1; else data <<= 1;
      }
      return data;
    };
  };

 var buildCodes = function (lengths) {
    var codes = new Array(lengths.length);
    var maxBits = lengths[0];
    for (var i=1; i<lengths.length; i++){
      if (maxBits < lengths[i]) maxBits = lengths[i];
    }

    var bitLengthsCount = new Array(maxBits + 1);
    for (var i=0; i<=maxBits; i++) bitLengthsCount[i]=0;
    
    for (var i=0; i<lengths.length; i++){
      ++bitLengthsCount[lengths[i]];
    }
  
    var nextCode = new Array(maxBits + 1);
    var code = 0;
    bitLengthsCount[0] = 0;

    for (var bits=1; bits<=maxBits; bits++){
      code = (code + bitLengthsCount[bits - 1]) << 1;
      nextCode[bits] = code;
    }

    for (var n=0; n<codes.length; n++){
      var len = lengths[n];
      if (len != 0) {
        codes[n] = nextCode[len];
        nextCode[len]++;
      }
    }
    return codes;
  };

  var initializeStaticTrees = function () {
    var codes = new Array(288);
    var codesLengths = new Array(288);
    
    for (var i = 0; i <= 143; i++)
    {
        codes[i] = 0x0030 + i;
        codesLengths[i] = 8;
    }
    for (var i = 144; i <= 255; i++)
    {
        codes[i] = 0x0190 + i - 144;
        codesLengths[i] = 9;
    }
    for (var i = 256; i <= 279; i++)
    {
        codes[i] = 0x0000 + i - 256;
        codesLengths[i] = 7;
    }
    for (var i = 280; i <= 287; i++)
    {
        codes[i] = 0x00C0 + i - 280;
        codesLengths[i] = 8;
    }
    staticCodes = buildTree(codes, codesLengths);

    var distances = new Array(32);
    var distancesLengths = new Array(32);
    for (var i = 0; i <= 31; i++)
    {
        distances[i] = i;
        distancesLengths[i] = 5;
    }
    staticDistances = buildTree(distances, distancesLengths);
  };

  var buildTree = function (codes, lengths) {
    var nonEmptyCodes = new Array(0);
    for(var i=0; i<codes.length; ++i)
    {
        if(lengths[i] > 0)
        {
            var code = new Object();
            code.bits = codes[i];
            code.length = lengths[i];
            code.index = i;
            nonEmptyCodes.push(code);
        }
    }
    return buildTreeBranch(nonEmptyCodes, 0, 0);
  };

  var buildTreeBranch = function (codes, prefix, prefixLength) {
    if(codes.length == 0) return null;
   
    var zeros = new Array(0);
    var ones = new Array(0);
    var branch = new Object();
    branch.isLeaf = false;
    for (var i=0; i<codes.length; ++i) {
      if(codes[i].length == prefixLength && codes[i].bits == prefix) {
        branch.isLeaf = true;
        branch.index = codes[i].index;
        break;
      } else {
        var nextBit = ((codes[i].bits >> (codes[i].length - prefixLength - 1)) & 1) > 0;
        if (nextBit) {
          ones.push(codes[i]);
        }
        else {
          zeros.push(codes[i]);
        }
      }
    }
    if (!branch.isLeaf) {
      branch.zero = buildTreeBranch(zeros, (prefix << 1), prefixLength + 1);
      branch.one = buildTreeBranch(ones, (prefix << 1) | 1, prefixLength + 1);
    }
    return branch;
  };

  var readDynamicTrees = function (bitReader) {
    var hlit = bitReader.readLSB(5) + 257;
    var hdist = bitReader.readLSB(5) + 1;
    var hclen = bitReader.readLSB(4) + 4;
    
    var clen = new Array(19);
    for(var i=0; i<clen.length; ++i) clen[i] = 0;
    for(var i=0; i<hclen; ++i) clen[clenMap[i]] = bitReader.readLSB(3);

    var clenCodes = buildCodes(clen);
    var clenTree = buildTree(clenCodes, clen);
    
    var lengthsSequence = new Array(0);
    while (lengthsSequence.length < hlit + hdist) {
      var p = clenTree;
      while (!p.isLeaf) {
        p = bitReader.readBit() ? p.one : p.zero;
      }
      
      var code = p.index;
      if(code <= 15) {
        lengthsSequence.push(code);
      } else if(code == 16) {
        var repeat = bitReader.readLSB(2) + 3;
        for(var q=0; q<repeat; ++q) {
          lengthsSequence.push(lengthsSequence[lengthsSequence.length - 1]);
        }
      }
      else if(code == 17) {
        var repeat = bitReader.readLSB(3) + 3;
        for (var q=0; q<repeat; ++q) {
          lengthsSequence.push(0);
        }
      }
      else if(code == 18) {
        var repeat = bitReader.readLSB(7) + 11;
        for (var q=0; q<repeat; ++q) {
          lengthsSequence.push(0);
        }
      }
    }

    var codesLengths = lengthsSequence.slice(0, hlit);
    var codes = buildCodes(codesLengths);
    var distancesLengths = lengthsSequence.slice(hlit, hlit + hdist);
    var distances = buildCodes(distancesLengths);
    
    var result = new Object();
    result.codesTree = buildTree(codes, codesLengths);
    result.distancesTree = buildTree(distances, distancesLengths);
    return result;
  };
        
  var Inflator = function(reader) {
    this.reader = reader;
    this.bitReader = new BitReader(reader);
    this.buffer = new Array(0);
    this.bufferPosition = 0;
    this.state = 0;
    this.blockFinal = false;
    this.counter = 0;
    this.readByte = function() {
      while (this.bufferPosition >= this.buffer.length) {
        var item = this.decodeItem();
        if(item == null) return -1;
        switch(item.itemType) {
          case 0:
              this.buffer = this.buffer.concat(item.array);
              break;
          case 2:
              this.buffer.push(item.symbol);
              break;
          case 3:
              var j = this.buffer.length - item.distance;
              for(var i=0;i<item.length;i++) {
                this.buffer.push(this.buffer[j++]);
              }
              break;
        }
      }
      var symbol = this.buffer[this.bufferPosition++];
      if (this.bufferPosition > 0xC000) {
        var shift = this.buffer.length - 0x8000;
        if(shift > this.bufferPosition) shift = this.bufferPosition;
        this.buffer.splice(0, shift);
        this.bufferPosition -= shift;
      }
      return symbol;
    };
    
    this.decodeItem = function() {
      if(this.state == 2) return null;
      
      var item;
      if(this.state == 0) {
        this.blockFinal = this.bitReader.readBit();
        var blockType = this.bitReader.readLSB(2);
        switch (blockType) {
          case 0:
            this.bitReader.align();
            var len = this.bitReader.readLSB(16);
            var nlen = this.bitReader.readLSB(16);
            if((len & ~nlen) != len) throw "Invalid block type 0 length";
            
            item = new Object();
            item.itemType = 0;
            item.array = new Array(len);
            for (var i=0;i<len;++i) {
                var nextByte = this.reader.readByte();
                if(nextByte < 0) throw "Uncomplete block";
                item.array[i] = nextByte;
            }
            if (this.blockFinal) this.state = 2;                 
            return item;
          case 1:
            this.codesTree = staticCodes;
            this.distancesTree = staticDistances;
            this.state = 1;
            break;
          case 2:
            var dynamicTrees = readDynamicTrees(this.bitReader);
            this.codesTree = dynamicTrees.codesTree;
            this.distancesTree = dynamicTrees.distancesTree;
            this.state = 1;
            break;
          default:    
            throw new "Invalid block type (3)";
        }
      }

      item = new Object();
      var p = this.codesTree;
      while (!p.isLeaf) {
        p = this.bitReader.readBit() ? p.one : p.zero;
      }
      if (p.index < 256) {
        item.itemType = 2;
        item.symbol = p.index;
      }
      else if (p.index > 256) {
        var lengthCode = p.index;
        if (lengthCode > 285) throw new "Invalid length code";
        
        var length = encodedLengthStart[lengthCode - 257];
        if (encodedLengthAdditionalBits[lengthCode - 257] > 0) {
          length += this.bitReader.readLSB(encodedLengthAdditionalBits[lengthCode - 257]);
        }
    
        p = this.distancesTree;
        while (!p.isLeaf) {
          p = this.bitReader.readBit() ? p.one : p.zero;
        }
        
        var distanceCode = p.index;
        var distance = encodedDistanceStart[distanceCode];
        if (encodedDistanceAdditionalBits[distanceCode] > 0) {
          distance += this.bitReader.readLSB(encodedDistanceAdditionalBits[distanceCode]);
        }
        item.itemType = 3;
        item.distance = distance;
        item.length = length;
      }
      else {
        item.itemType = 1;
        this.state = this.blockFinal ? 2 : 0;
      }
      return item;
    };
  };

  /* initialization */
  initializeStaticTrees();

  return Inflator;

});
define('pngParser',['./jdataview', './deflateOld'], function (jDataView, Inflator) {
  

  var __bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  var PNGStringParser = function () {
    this.paeth_predictor = __bind(this.paeth_predictor, this);
    this.filter_paeth = __bind(this.filter_paeth, this);
    this.filter_average = __bind(this.filter_average, this);
    this.filter_up = __bind(this.filter_up, this);
    this.filter_sub = __bind(this.filter_sub, this);
    this.filter_none = __bind(this.filter_none, this);
    this.read_line = __bind(this.read_line, this);

    this.parse = function (binary_string) {
      var headerDataUnit = {};
      headerDataUnit.header = {};
      headerDataUnit.data = [];
      var chunk;
      this.view = new jDataView(binary_string);
      this.idat_chunks = [];
      this.eof = false;
      this.number_of_ihdr = 0;
      this.number_of_idat = 0;
      this.check_signature();
      this.headerDataUnits = [];
      this.filters = [this.filter_none, this.filter_sub, this.filter_up, this.filter_average, this.filter_paeth];
      while (!this.eof) {
        chunk = this.read_chunk();
        switch (chunk.type) {
          case 'IHDR':
            this.read_ihdr(chunk.data);
            break;
          case 'wHAT':
            this.read_what(chunk.data);
            break;
          case 'IDAT':
            this.read_idat(chunk.data);
            break;
          case 'IEND':
            console.log('end of file, baby!');
        }
      }
      this.chunk_reader = new Inflator({
        chunk: 0,
        index: 2,
        data: this.idat_chunks,
        num_chunks: this.number_of_idat,
        readByte: function() {
          if (this.chunk >= this.data.length) return -1;
          while (this.index >= this.data[this.chunk].length) {
            this.index = 0;
            this.chunk += 1;
            if (this.chunk >= this.num_chunks) return -1;
          }
          this.index += 1;
          return this.data[this.chunk][this.index - 1];
        }
      });

      headerDataUnit.header.NAXIS1 = this.width;
      headerDataUnit.header.NAXIS2 = this.height;
      headerDataUnit.header.BITPIX = 16;
      headerDataUnit.header.MINPIXEL = this.min_pixel;
      headerDataUnit.header.MAXPIXEL = this.max_pixel;

      for (var i = 0; i < this.height; ++i) {
        headerDataUnit.data = this.data; //headerDataUnit.data.concat(this.read_line());
      }

      this.headerDataUnits.push(headerDataUnit);
      this.onParsed(this.headerDataUnits);

    };

    this.onParsed = function (headerDataUnits) {};
    this.onError = function (error) {
      console.error(error);
    };

  };

  // Convert bytes to an integer
  PNGStringParser.to_integer = function(bytes, index) {
    return (bytes[index] << 24) | (bytes[index + 1] << 16) | (bytes[index + 2] << 8) | bytes[index + 3];
  };

  //Verify the PNG signature
  PNGStringParser.png_signature = [137, 80, 78, 71, 13, 10, 26, 10];

  PNGStringParser.prototype.check_signature = function() {
    var byte, _i, _len, _ref, _results;
    _ref = PNGStringParser.png_signature;
    _results = [];
    for (_i = 0, _len = _ref.length; _i < _len; _i++) {
      byte = _ref[_i];
      _results.push(this.verify_byte(byte));
    }
    return _results;
  };

  PNGStringParser.prototype.verify_byte = function(byte) {
    if (byte !== this.view.getUint8()) throw "PNG signature is not correct";
  };

  // Read a PNG chunk, determines the length and type, and extracts the data
  PNGStringParser.prototype.read_chunk = function() {
    var data, i, length, type;
    length = this.view.getUint32();
    type = this.view.getString(4);
    console.log(type, length);
    data = (function() {
      var _results;
      _results = [];
      for (i = 1; 1 <= length ? i <= length : i >= length; 1 <= length ? i++ : i--) {
        _results.push(this.view.getUint8());
      }
      return _results;
    }).call(this);
    if (type === 'IEND') {
      this.eof = true;
      return {
        type: type,
        data: data
      };
    }
    if (data.length !== length) throw "PNG chunk out of bounds";
    this.view.seek(this.view.tell() + 4);
    return {
      type: type,
      data: data
    };
  };

  /*
    Read the required IHDR chunk of the PNG.  Sets variables for 
    scanning lines.  Extracts:
     * width
     * height
     * color type
     * bit depth
     * compression
     * filter method
     * interlace method
  */
  PNGStringParser.prototype.read_ihdr = function(data) {
    var allowed_bit_depths, allowed_color_types, index;
    this.number_of_ihdr += 1;
    if (this.number_of_ihdr > 1) throw "PNG contains too many IHDR chunks";
    this.width = PNGStringParser.to_integer(data, 0);
    this.height = PNGStringParser.to_integer(data, 4);
    allowed_color_types = [0];
    if (allowed_color_types.indexOf(data[9]) < 0) {
      throw "PNG contains an unallowed color type (only supporting grayscale)";
    }
    this.color_type = data[9];
    allowed_bit_depths = [8, 16];
    if (allowed_bit_depths.indexOf(data[8]) < 0) {
      throw "PNG contains an unallowed bit depth (only supporting 8 and 16 bit depths)";
    }
    this.bit_depth = data[8];
    this.shift = this.bit_depth - 8;
    this.param_length = this.bit_depth / 8;
    this.line_length = this.param_length * this.width;
    this.index_offset = this.param_length - 1;
    this.prev_line = (function() {
      var _ref, _results;
      _results = [];
      for (index = 1, _ref = this.line_length; 1 <= _ref ? index <= _ref : index >= _ref; 1 <= _ref ? index++ : index--) {
        _results.push(0);
      }
      return _results;
    }).call(this);
    if (data[10] !== 0) throw "PNG contains an unknown compression method";
    this.compression = data[10];
    if (data[11] !== 0) throw "PNG contains an unknown filter method";
    this.filter_method = data[11];
    if (data[12] !== 0 && data[12] !== 1) {
      throw "PNG contains an unknown interlace method";
    }
    this.interlace_method = data[12];
    return console.log(this.width, this.height, this.bit_depth, this.color_type);
  };

  /*
    Read the custom wHAT chunk.  Extracts
     * Minimum pixel value
     * Maximum pixel value
  */
  PNGStringParser.prototype.read_what = function(data) {
    if (this.bit_depth === 8) {
      this.min_pixel = data[0];
      this.max_pixel = data[1];
    } else if (this.bit_depth === 16) {
      this.min_pixel = data[0] << 8 | data[1];
      this.max_pixel = data[2] << 8 | data[3];
    }
    return console.log('min and max pixels', this.min_pixel, this.max_pixel);
  };

  /*
    Reads the IDAT (image data) into the class scope for later processing.
  */
  PNGStringParser.prototype.read_idat = function(data) {
    this.idat_chunks[this.number_of_idat] = data;
    return this.number_of_idat += 1;
  };

  /*
    Scans a line for image data.
  */
  PNGStringParser.prototype.read_line = function() {
    var a, a_param, b, c, data, element, filter_code, index, recon_data, _len, _ref;
    a_param = (function() {
      var _ref, _results;
      _results = [];
      for (index = 1, _ref = this.param_length; 1 <= _ref ? index <= _ref : index >= _ref; 1 <= _ref ? index++ : index--) {
        _results.push(0);
      }
      return _results;
    }).call(this);
    filter_code = this.chunk_reader.readByte();
    data = (function() {
      var _ref, _results;
      _results = [];
      for (index = 1, _ref = this.line_length; 1 <= _ref ? index <= _ref : index >= _ref; 1 <= _ref ? index++ : index--) {
        _results.push(this.chunk_reader.readByte());
      }
      return _results;
    }).call(this);
    recon_data = [];
    for (index = 0, _len = data.length; index < _len; index++) {
      element = data[index];
      a = a_param[index % this.param_length];
      b = this.prev_line[index];
      c = (_ref = this.prev_line[index - this.param_length]) != null ? _ref : 0;
      recon_data[index] = this.filters[filter_code](data[index], a, b, c);
      a_param[index % this.param_length] = recon_data[index];
    }
    this.prev_line = recon_data;
    data = (function() {
      var _ref2, _ref3, _results;
      _results = [];
      for (index = 0, _ref2 = this.line_length - 1, _ref3 = this.param_length; 0 <= _ref2 ? index <= _ref2 : index >= _ref2; index += _ref3) {
        _results.push(recon_data[index] << this.shift | recon_data[index + this.index_offset]);
      }
      return _results;
    }).call(this);
    return data;
  };

  /*
    Various filter functions, defined by the PNG specifications.
  */
  PNGStringParser.prototype.filter_none = function(x, a, b, c) {
    return x;
  };

  PNGStringParser.prototype.filter_sub = function(x, a, b, c) {
    return (x + a) & 0xff;
  };

  PNGStringParser.prototype.filter_up = function(x, a, b, c) {
    return (x + b) & 0xff;
  };

  PNGStringParser.prototype.filter_average = function(x, a, b, c) {
    return (x + ((a + b) >> 1)) & 0xff;
  };

  PNGStringParser.prototype.filter_paeth = function(x, a, b, c) {
    var pr;
    pr = this.paeth_predictor(a, b, c);
    return (x + pr) & 0xff;
  };

  PNGStringParser.prototype.paeth_predictor = function(a, b, c) {
    var p, pa, pb, pc, pr;
    p = a + b - c;
    pa = Math.abs(p - a);
    pb = Math.abs(p - b);
    pc = Math.abs(p - c);
    if (pa <= pb && pa <= pc) {
      pr = a;
    } else if (pb <= pc) {
      pr = b;
    } else {
      pr = c;
    }
    return pr;
  };

  return PNGStringParser;

});