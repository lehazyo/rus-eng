$(document).ready(function(){
  // используетс ли текст по умолчанию в поле ввода
  var default_text = true;
  var $textarea = $(".detector__textarea");

  $textarea.on("input propertychange change", function(){
    default_text = false;
    var $t = $(this);
    var value = $t.val();
    check_text(value);
  });

  var initial_text = $textarea.val();
  check_text(initial_text);
});

function check_text(text_to_check) {
  var split_text = text_to_check.split("");
  var $output = $(".detector__result");
  $output.html("");
  var russian_pattern = new RegExp("^[а-яё]{1,1}$", "i");
  var english_pattern = new RegExp("^[a-z]{1,1}$", "i");

  var symbols_count = {
    "russian": 0,
    "english": 0,
    "neutral": 0,
  };

  for(var i=0;i<split_text.length;i++) {
    var language = "neutral";
    var letter = split_text[i];
    if(russian_pattern.test(letter)) {
      language = "russian";
    } else if(english_pattern.test(letter)) {
      language = "english";
    }
    var symbols_inclinations = [
      "символ",
      "символа",
      "символов",
    ];

    var show_check = true;
    var letter_node_class = "detector_letter";
    if(language != "") {
      letter_node_class += " detector_letter--" + language
      if(typeof symbols_count[language] !== "undefined") {
        symbols_count[language]++;
      }
    }
    var letter_html = letter;
    if(letter_html == " ") {
      letter_html = " ";
    }
    if(letter_html == "\n") {
      letter_html = "<br/>";
      show_check = false;
    }

    if(show_check) {
      var $letter_node = $("<span/>", {
        "class": letter_node_class,
        "html": letter_html
      });

      $output.append($letter_node);
    } else {
      $output.append(letter_html);
    }
  }

  for(var key in symbols_count) {
    var value = symbols_count[key];
    var $corr_stat = $(".explanation__stats--" + key);
    var corr_word = incline_by_number(value, symbols_inclinations);
    var final_text = value + " " + corr_word;
    $corr_stat.text(final_text);
  }
}

function incline_by_number(number, inclinations) {
  var number_string = number + "";
  var last_digit =  number_string.substr(-1, 1);
  last_digit = parseInt(last_digit);
  if(number >= 5 && number <= 20) {
    return inclinations[2];
  } else {
    if(last_digit == 1) {
      return inclinations[0];
    } else if(last_digit == 2 || last_digit == 3 || last_digit == 4) {
      return inclinations[1];
    } else {
      return inclinations[2];
    }
  }
}