class RusEngDetector {
  constructor(options) {
    this.output_type = "html";
    this.letter_dimensions = [0, 0];
    this.setLetterDimensions();

    if(typeof options !== "undefined") {
      if(typeof options.output_type !== "undefined") {
        if(options.output_type.match(/^(html|canvas)$/)) {
          this.output_type = options.output_type;
        }
      }
    }

    this.input = document.querySelector(".input");
    this.letters = document.querySelector(".letters");
    this.letters_wrapper = document.querySelector(".letters_wrapper");

    this.letters_array = [];

    this.lines_array = null;
    this.clearLinesArray();

    this.canvas = document.querySelector(".canvas");
    this.canvas_context = this.canvas.getContext("2d");
    this.canvas_wrapper = document.querySelector(".canvas_wrapper");

    this.letters_html = "";
    this.word_in_progress = false;
    this.current_word_element = null;

    this.chars_per_line = this.getCharsPerLine();

    this.input.addEventListener("input", this.onInput.bind(this));
    this.input.addEventListener("scroll", this.onInputScroll.bind(this));

    window.addEventListener("resize", this.onResize.bind(this));

    this.styles = {
      "rus": {
        "bg": "#f99"
      },
      "eng": {
        "bg": "#99f"
      },
      "ukr": {
        "bg": "#f9f"
      },
      "unknown": {
        "bg": "#ff9"
      },
      "punctuation": {
        "bg": "#999"
      },
      "digits": {
        "bg": "#9f9"
      },
      "space": {
        "bg": "#ddd"
      }
    };

    this.setTestContent();

    document.fonts.ready.then(() => {
      this.setLetterDimensions();
      this.renderCanvas();
    });
  }

  onInput() {
    this.readInput();
    this.render();
    this.onInputScroll();
  }

  onInputScroll() {
    if(this.output_type === "html") {
      this.letters_wrapper.scrollTop = this.input.scrollTop;
      this.letters_wrapper.scrollLeft = this.input.scrollLeft;
    }

    if(this.output_type === "canvas") {
      this.canvas_wrapper.scrollTop = this.input.scrollTop;
      this.canvas_wrapper.scrollLeft = this.input.scrollLeft;
    }
  }

  render() {
    if(this.output_type === "html") {
      this.renderHtml();
    }

    if(this.output_type === "canvas") {
      this.renderCanvas();
    }
  }

  renderHtml() {
    this.letters.innerHTML = "";

    var temp_container = document.createElement("div");
    temp_container.style.width = this.letters.clientWidth;

    for(var i=0;i<this.letters_array.length;i++) {
      var letter = this.letters_array[i];
      if(this.checkIfBreak(letter.original)) {
        var new_element = document.createElement("br");
        temp_container.appendChild(new_element);
      } else {
        if(letter.word_start) {
          this.current_word_element = document.createElement("span");
          this.current_word_element.classList.add("word");
        }
        
        var new_element = document.createElement("span");
        new_element.classList.add("letter", "letter--" + letter.language);
        new_element.innerHTML = letter.safe;

        if(this.current_word_element !== null) {
          this.current_word_element.appendChild(new_element);
        } else {
          temp_container.appendChild(new_element);
        }

        if(letter.word_end) {
          temp_container.appendChild(this.current_word_element);

          this.current_word_element = null;
        }

        if(letter.is_space) {
          if(this.checkIfTrailingSpace(letter, new_element)) {
            this.shrinkTrailingSpace(new_element);
          }
        }
      }
    }

    this.letters.innerHTML = temp_container.innerHTML;

    temp_container = null;
  }

  renderCanvas() {
    this.canvas.width = this.input.scrollWidth;
    this.canvas.height = Math.ceil((this.lines_array.length - 1) * this.letter_dimensions[1]) + (this.checkXScroll() ? 17 : 0);

    this.canvas_context.clearRect(0, 0, this.canvas.width, this.canvas.height);

    for(var line_index=1;line_index<this.lines_array.length;line_index++) {
      var line = this.lines_array[line_index];
      var column_counter = 0;
      for(var word_index = 0;word_index<line.length;word_index++) {
        var word = line[word_index];
        for(var letter_index = 0;letter_index<word.length;letter_index++) {
          var letter = word[letter_index];
          var letter_language = this.defineLanguage(letter);
          this.drawCanvas(letter_language, line_index, column_counter);
          column_counter++;
        }
      }
    }
  }

  setTestContent() {
    this.input.value = "Pоссия — свящeнная нашa держaва\n\nGod, whо made thee mіghty, mаke thee mightіer yet\n\nЩе не вмeрли України і слaва, і воля";

    var fake_event = new Event("input");
    this.input.dispatchEvent(fake_event);
  }

  readInput() {
    this.checkInputScrolls();

    if(this.output_type === "html") {
      this.word_in_progress = false;

      var input = this.getInput();
      var split_input = input.split("");
      this.letters_array = [];
      for(var i=0;i<split_input.length;i++) {
        var symbol = split_input[i];
        var symbol_language = this.defineLanguage(symbol);

        var symbol_object = {
          original: symbol,
          safe: this.safeSymbol(symbol),
          language: symbol_language,
          word_start: false,
          word_end: false,
          is_space: false,
          line: null,
          column: null,
        };

        // if(symbol_language.match(/^(neutral|unknown)$/i)) {
        if(symbol.match(/^\s$/)) {
          symbol_object.is_space = true;

          if(this.word_in_progress) {
            this.word_in_progress = false;
            if(typeof this.letters_array[i-1] !== "undefined") {
              this.letters_array[i-1].word_end = true;
            }
          }
        } else {
          if(i == split_input.length - 1) {
            symbol_object.word_end = true;
          }
          if(!this.word_in_progress) {
            this.word_in_progress = true;
            symbol_object.word_start = true;
          }
        }

        this.letters_array.push(symbol_object);
      }
    }

    if(this.output_type === "canvas") {
      this.getLines();
    }
  }

  getInput() {
    return this.input.value;
  }

  getLines() {
    this.clearLinesArray();
    this.chars_per_line = this.getCharsPerLine();

    var value = this.getInput();
    // var value_by_lines_array = value.split(/[\s\S]$/m);
    var value_by_lines_array = value.split(/[\n\r]/);
    var line_counter = 0;
    var column_counter = 0;
    for(var i=0;i<value_by_lines_array.length;i++) {
      line_counter++;
      column_counter = 0;
      if(typeof this.lines_array[line_counter] === "undefined") {
        this.lines_array[line_counter] = [];
      }
      var pseudo_line = value_by_lines_array[i];
      var words_in_line = this.splitByBoundaries(pseudo_line);
      for(var j=0;j<words_in_line.length;j++) {
        var word_in_line = words_in_line[j];
        // the word is some set of spaces
        if(word_in_line.match(/^\s+$/)) {
          column_counter += word_in_line.length;
          this.pushToLinesArray(line_counter, word_in_line);
        } else {
          if(column_counter >= this.chars_per_line) {
            line_counter++;
            column_counter = 0;
          }

          var skip_word_add = false;

          // word that is longer than single line
          if(word_in_line.length > this.chars_per_line) {
            if(this.wordIsDashSeparated(word_in_line)) {
              var dash_separated_words = this.breakDashSeparatedWord(word_in_line, column_counter);
              for(var k=0;k<dash_separated_words.length;k++) {
                if(column_counter + dash_separated_words[k].length > this.chars_per_line) {
                  line_counter++;
                  column_counter = 0;
                }
                column_counter += dash_separated_words[k].length;
                this.pushToLinesArray(line_counter, dash_separated_words[k]);
              }
            } else {
              for(var k=0;k<word_in_line.length;k+=this.chars_per_line) {
                line_counter++;
                column_counter = 0;
                this.pushToLinesArray(line_counter, word_in_line.substr(k, this.chars_per_line));
              }
            }
          // word that is shorter or equal to single line
          } else {
            if(word_in_line.length + column_counter > this.chars_per_line) {
              if(this.wordIsDashSeparated(word_in_line)) {
                var dash_separated_words = this.breakDashSeparatedWord(word_in_line, column_counter);
                for(var k=0;k<dash_separated_words.length;k++) {
                  if(column_counter + dash_separated_words[k].length > this.chars_per_line) {
                    line_counter++;
                    column_counter = 0;
                  }
                  column_counter += dash_separated_words[k].length;
                  this.pushToLinesArray(line_counter, dash_separated_words[k]);
                }
                skip_word_add = true;
              } else {
                line_counter++;
                column_counter = word_in_line.length;
              }
            } else {
              column_counter += word_in_line.length;
            }
            if(!skip_word_add) {
              this.pushToLinesArray(line_counter, word_in_line);
            }
          }
        }
      }
    }
  }

  defineLanguage(symbol) {
    if(symbol.match(/\d/)) {
      return "digits";
    } else if(symbol.match(/\s/)) {
      return "space";
    } else if(symbol.match(/[ҐЄІЇ]/i)) {
      return "ukr";
    } else if(symbol.match(/[а-яё]/i)) {
      return "rus";
    } else if (symbol.match(/[a-z]/i)) {
      return "eng";
    } else if (symbol.match(/[\~\!@#\$\%\^\&\*\(\)\-\–\—=\+_\\\s\'\",\.\/\?`\:\;\[\]\{\}\<\>«»]/i)) {
      return "punctuation";
    } else {
      return "unknown";
    }
  }

  /**
   * Turns symbol into html-encoded entity
   * @param {string} symbol
   * @return {string}
   */
  safeSymbol(symbol) {
    if(symbol == " ") {
      return "&nbsp;"
    } else {
      return symbol.replace(/[\u00A0-\u9999<>\&]/gim, function(i) {
         return '&#'+i.charCodeAt(0)+';';
      });
    }
  }


  /**
   * Checks if current symbol is a break
   * @param {string} symbol
   * @return {boolean}
   */
  checkIfBreak(symbol) {
    return (symbol.match(/^\n$/));
  }


  /**
   * Checks if element of space symbol is last in line and therefore is shrinked by textarea
   * @param {object} letter_object
   * @param {HTMLElement} element
   * @return {boolean}
   */
  checkIfTrailingSpace(letter_object, element) {
    var initial_width = element.offsetWidth;
    element.style.width = 0;
    var is_trailing_space = element.offsetLeft + initial_width >= this.letters.offsetWidth;
    element.style.width = "";
    return is_trailing_space;
  }


  /**
   * Shrinks trailing space to maximum available width
   * @param {HTMLElement} element
   * @return {undefined}
   */
  shrinkTrailingSpace(element) {
    element.style.width = 0;
    var width_to_set = this.letters.offsetWidth - element.offsetLeft - 1;
    element.style.width = width_to_set + "px";
  }


  /**
   * Checks if textarea has scrollbars and sets scrollbars for letters element
   * @return {undefined}
   * 
   */ 
  checkInputScrolls() {
    var has_x_scroll = this.checkXScroll();
    var has_y_scroll = this.checkYScroll();

    if(this.output_type === "html") {
      this.letters_wrapper.style.overflowX = has_x_scroll ? "scroll" : "";
      this.letters_wrapper.style.overflowY = has_y_scroll ? "scroll" : "";
    }
    
    if(this.output_type === "canvas") {
      this.canvas_wrapper.style.overflowX = has_x_scroll ? "scroll" : "";
      this.canvas_wrapper.style.overflowY = has_y_scroll ? "scroll" : "";
    }
  }

  checkXScroll() {
    return this.input.scrollWidth > this.input.clientWidth;
  }

  checkYScroll() {
    return this.input.scrollHeight > this.input.clientHeight;
  }


  /**
   * This function creates 100 letters horizontally and 100 vertically
   * to measure precise letter dimensions (clientWidth returns rounded)
   * @return {undefined}
   */
  setLetterDimensions() {
    var body = document.querySelector("body");

    var test_letters_wrapper = document.createElement("div");
    test_letters_wrapper.className = "test_letters_wrapper";
    var test_letters = document.createElement("div");
    test_letters.className = "test_letters";
    test_letters_wrapper.appendChild(test_letters);

    for(var i=0;i<101;i++) {
      var letter = document.createElement("span");
      letter.className = "letter";
      letter.textContent = "a";
      test_letters.appendChild(letter);
    }
    var rightmost_letter = letter;
    for(var i=0;i<100;i++) {
      var breaker = document.createElement("br");
      var letter = document.createElement("span");
      letter.className = "letter";
      letter.textContent = "a";
      test_letters.appendChild(breaker);
      test_letters.appendChild(letter);
    }
    var bottommost_letter = letter;
    body.appendChild(test_letters_wrapper);

    var width = rightmost_letter.offsetLeft / 100;
    var height = bottommost_letter.offsetTop / 100;

    this.letter_dimensions = [width, height];

    body.removeChild(test_letters_wrapper);
  }

  getCharsPerLine() {
    return Math.floor(this.input.clientWidth / this.letter_dimensions[0]);
  }

  /**
   * Breaks word into parts that are divided by word boundaries
   * Implemented because JavaSript can't split cyrillic words by /\b/
   * @param {string} 
   * @return {string}
   */
  splitByBoundaries(text) {
    if(text === "") {
      return [];
    }

    var result = [];
    var current_phase = (text.substr(0, 1).match(/\s/)) ? "space" : "word";
    var current_word = "";

    for(var i=0;i<text.length;i++) {
      if(current_phase == "space") {
        if(!text[i].match(/^\s$/)) {
          current_phase = "word";
          result.push(current_word);
          current_word = "";
        }
      }

      if(current_phase == "word") {
        if(!text[i].match(/^\S$/)) {
          current_phase = "space";
          result.push(current_word);
          current_word = "";
        }
      }

      current_word += text[i];
    }

    result.push(current_word);

    return result;
  }

  pushToLinesArray(line_counter, line) {
    if(typeof this.lines_array[line_counter] === "undefined") {
      this.lines_array[line_counter] = [];
    }
    this.lines_array[line_counter].push(line);
  }

  clearLinesArray() {
    this.lines_array = ["nothing"];
  }

  drawCanvas(letter_language, line_index, column_index) {
    var fill_style = "";
    this.canvas_context.fillStyle = this.styles[letter_language].bg;

    var true_line_index = line_index - 1;
    var x = column_index * this.letter_dimensions[0];
    var y = true_line_index * this.letter_dimensions[1];
    var ceiled_width = Math.ceil(this.letter_dimensions[0]);
    var ceiled_height = Math.ceil(this.letter_dimensions[1]);

    this.canvas_context.fillRect(x, y, ceiled_width, ceiled_height);
  }

  /**
   * Breaks words into chunks
   * @param {string} word
   * @param {number} column_counter
   * @return {array} array of word separated
   */
  breakDashSeparatedWord(word, column_counter) {
    var max_lines = Math.ceil(word.length / this.chars_per_line) + 1; 
    // + 1 in case there is no space left for first line
    var words_array = [];
    var word_position = 0;
    for(var i=0;i<max_lines;i++) {
      var word_to_add = null;
      var line_remainder = this.chars_per_line - column_counter;
      var substring = word.substr(word_position, line_remainder);
      if(column_counter + substring.length < this.chars_per_line) {
        word_to_add = substring;
        word_position += substring.length;
      } else {
        if(this.wordIsDashSeparated(substring)) {
          var max_dashed_word = substring.match(/.*[-–—]/);
          if(max_dashed_word) {
            max_dashed_word = max_dashed_word[0];
            word_to_add = max_dashed_word;
            word_position += max_dashed_word.length;
          }
        } else {
          word_to_add = word.substr(word_position, line_remainder);
        }
      }
      if(word_to_add !== null) {
        words_array.push(word_to_add);
        column_counter = 0;
      }
    }
    return words_array;
  }

  /**
   * Checks if word is separated with any kind of dash
   * @param {string} word
   * @return {boolean}
   */
  wordIsDashSeparated(word) {
    return !!word.match(/[-–—]/);
  }

  onResize() {
    this.getCharsPerLine();
    this.onInput();
  }
}