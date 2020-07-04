import './style.css';

import $ from 'jquery'; //make jquery() available as $
import Meta from './meta.js'; //bundle the input to this program
import meta from './meta.js';

//default values
const DEFAULT_REF = '_'; //use this if no ref query param
const N_UNI_SELECT = 4; //switching threshold between radio & select
const N_MULTI_SELECT = 4; //switching threshold between checkbox & select

/*************************** Utility Routines **************************/

/** Return `ref` query parameter from window.location */
function getRef() {
  const url = new URL(window.location);
  const params = url.searchParams;
  return params && params.get('ref');
}

/** Return window.location url with `ref` query parameter set to `ref` */
function makeRefUrl(ref) {
  const url = new URL(window.location);
  url.searchParams.set('ref', ref);
  return url.toString();
}

/** Return a jquery-wrapped element for tag and attr */
function makeElement(tag, attr = {}) {
  const $e = $(`<${tag}/>`);
  Object.entries(attr).forEach(([k, v]) => $e.attr(k, v));
  return $e;
}

/** Given a list path of accessors, return Meta[path].  Handle
 *  occurrences of '.' and '..' within path.
 */
function access(path) {
  const normalized = path.reduce((acc, p) => {
    if (p === '.') {
      return acc;
    } else if (p === '..') {
      return acc.length === 0 ? acc : acc.slice(0, -1)
    } else {
      return acc.concat(p);
    }
  }, []);
  return normalized.reduce((m, p) => m[p], Meta);
}

/** Return an id constructed from list path */
function makeId(path) {
  return ('/' + path.join('/'));
}

function getType(meta) {
  return meta.type || 'block';
}

/** Return a jquery-wrapped element <tag meta.attr>items</tag>
 *  where items are the recursive rendering of meta.items.
 *  The returned element is also appended to $element.
 */
function items(tag, meta, path, $element) {
  const $e = makeElement(tag, meta.attr);
  (meta.items || []).
  forEach((item, i) => render(path.concat('items', i), $e));
  $element.append($e);
  return $e;
}

/************************** Event Handlers *****************************/

//@TODO

/********************** Type Routine Common Handling *******************/
function OptionItems(items) {
  return items
    .map(function (item, i) {
      const element = makeElement('option', {
        "value": item.key
      }).text(item.text);
      return element[0];
    })


}

function InputItems(items, type, attr) {
  if (type === 'radio') {

    const eachItem = [];
    items.forEach(function (item, i) {

      const inputElem = makeElement('input', {
        "name": attr.name,
        "value": item.key,
        type: type
      });
      eachItem.push(inputElem[0]);

      const labelElem = makeElement('label', {}).text(item.key);
      eachItem.push(labelElem[0]);

    })
    return eachItem;

  }
  if (type === 'checkbox') {

    const eachItem = [];
    items.forEach(function (item, i) {

      const inputElem = makeElement('input', {
        "name": attr.name,
        "value": item.key,
        type: type
      });

      eachItem.push(inputElem[0]);

      const labelElem = makeElement('label', {}).text(item.key);
      eachItem.push(labelElem[0]);

    })
    return eachItem;










  }
  

}
//@TODO


/***************************** Type Routines ***************************/

//A type handling function has the signature (meta, path, $element) =>
//void.  It will append the HTML corresponding to meta (which is
//Meta[path]) to $element.

function block(meta, path, $element) {
  items('div', meta, path, $element);
}

function form(meta, path, $element) {
  const $form = items('form', meta, path, $element);
  $form.submit(function (event) {
    event.preventDefault();
    const $form = $(this);

     $('input,select,textarea', $form).trigger('blur');
     $('input,select', $form).trigger('change');
  
   
      const results = $form.serializeArray().reduce((acc, cur) => {


      if (cur['name'] === 'multiSelect' || cur['name'] === 'primaryColors') {
        //debugger
        if (!Array.isArray(acc[cur['name']])) {
          acc[cur['name']] = [];
        }
        acc[cur['name']].push(cur['value'])
      } else {
        acc[cur['name']] = cur['value'];
      }
      return acc;
    }, {})

    console.log(JSON.stringify(results, null, 2));
  });
}

function header(meta, path, $element) {
  const $e = makeElement(`h${meta.level || 1}`, meta.attr);
  $e.text(meta.text || '');
  $element.append($e);
}

function input(meta, path, $element) {
  const text = (meta.required) ? meta.text + "*" : meta.text;
  const id = meta.attr.id || makeId(path);
  const attr = Object.assign({}, meta.attr, {
    id: id
  });
  $element.append(makeElement('label', {
    for: id
  }).text(text));
  const element = makeElement('div', {}).text('');
  const $input = makeElement('input', attr).text(meta.text);
  //const $inputChecked = makeElement('input:checked', attr).text(meta.text);
  const $textarea = makeElement('textarea', attr).text(meta.text);
  if (meta.subType === 'textarea')
    element.append($textarea);
  else
    element.append($input);
  const $errorDiv = makeElement('div', {
    class: "error",
    id: id + "-err"
  }).text('');

   //validation for input text on blur event
  $input.on('blur', (event) => {
    //debugger
    if ( Boolean(meta.required) && (
        (meta.chkFn != undefined && meta.chkFn(event.target.value.trim()) == null)||
      meta.chkFn == undefined && event.target.value.trim() === "")
    ) {
      let errorMsg = (meta.errMsgFn == undefined || event.target.value.trim() === "") ? "The field " + meta.text + " must be specified." :  meta.errMsgFn(event.target.value, meta);
      $errorDiv.text(errorMsg)
      $errorDiv.addClass("error");
    } else {
      $errorDiv.text("")
      $errorDiv.removeClass("error");
    }

  });


  //validation for input text on chnage event
  $input.change((event) => {
    //debugger
    if ( Boolean(meta.required) && (
        (meta.chkFn != undefined && meta.chkFn(event.target.value.trim())) === null ||
      meta.chkFn == undefined && event.target.value.trim() === "")
    ) {
      let errorMsg = (meta.errMsgFn == undefined || event.target.value.trim() === "") ? "The field " + meta.text + " must be specified." :  meta.errMsgFn(event.target.value, meta);

      $errorDiv.text(errorMsg)
      $errorDiv.addClass("error");
    } else {
      $errorDiv.text("")
      $errorDiv.removeClass("error");
    }

  });
  
  element.append($errorDiv);
  $element.append(element)
}

function link(meta, path, $element) {
  const parentType = getType(access(path.concat('..')));
  const {
    text = '', ref = DEFAULT_REF
  } = meta;
  const attr = Object.assign({}, meta.attr || {}, {
    href: makeRefUrl(ref)
  });
  $element.append(makeElement('a', attr).text(text));
}

function multiSelect(meta, path, $element) {
  const text = (meta.required) ? meta.text + "*" : meta.text;
  const id = meta.attr.id || makeId(path);
  const attr = Object.assign({}, meta.attr, {
    id: id
  });
  $element.append(makeElement('label', {
    for: id
  }).text(text));
  const element = makeElement('div', {}).text('');

  const $errorDiv = makeElement('div', {
    class: "error",
    id: id + "-err"
  }).text('');

  //debugger;
  if (meta.items.length > (N_MULTI_SELECT || 4)) {
    const $select = makeElement('select', {
      name: 'multiSelect',
      multiple: 'multiple'
    }).text('');
    const $options = OptionItems(meta.items);
    //debugger;
    $select.append($options);
    element.append($select)
  } else {
    meta.attr.id = makeId(path);
    const $radioButton = InputItems(meta.items, 'checkbox', attr);
    const $fieldset = makeElement('div', {
      class: "fieldset",
      id: id
    }).text('');


    Array.from($radioButton).filter(data => data.type === "checkbox")
      .forEach(function (data) {
        console.log(meta);
        $(data).on('click', (event) => {
          debugger
          if (!Array.from(document.getElementsByName(attr.name)).map(data => data.checked).reduce((acc, curr) => (curr || acc))) {
            $errorDiv.text("The field " + meta.text + " must be specified.")
            $errorDiv.addClass("error")
          } else {
            $errorDiv.text("")
            $errorDiv.removeClass("error")
          }
        })
      })

    $fieldset.append($radioButton);
    element.append($fieldset);
  }



  element.append($errorDiv);
  $element.append(element);






}

function para(meta, path, $element) {
  items('p', meta, path, $element);
}

function segment(meta, path, $element) {
  if (meta.text !== undefined) {
    $element.append(makeElement('span', meta.attr).text(meta.text));
  } else {
    items('span', meta, path, $element);
  }
}


function submit(meta, path, $element) {
  const $e = makeElement('div', meta.attr);
  //$e.text(meta.text || '');
  $element.append($e);
  const attr = Object.assign({}, meta.attr, {
    type: 'submit'
  });
  const button = makeElement('button', attr).text(meta.text || 'Submit');

  // button.on('submit', event => {

  //    $('input,select,textarea', $form).trigger('blur');
  //   $('input,select', $form).trigger('change');
  // }
  // )


  $element.append(button);



}




function uniSelect(meta, path, $element) {
  const text = (meta.required) ? meta.text + "*" : meta.text;
  const id = meta.attr.id || makeId(path);
  const attr = Object.assign({}, meta.attr, {
    id: id
  });
  $element.append(makeElement('label', {
    for: id
  }).text(text));
  const element = makeElement('div', {}).text('');


  //debugger;
  if (meta.items.length > (N_UNI_SELECT || 4)) {
    const $select = makeElement('select', {}).text('');
    const $options = OptionItems(meta.items);

    //validation for dropdown box
    $select.on('blur', (event) => {
      //debugger
      if ( Boolean(meta.required) && (
          (meta.chkFn != undefined && meta.chkFn(event.target.value.trim()) == null)||
        meta.chkFn == undefined && event.target.value.trim() === "")
      ) {
        let errorMsg = (meta.errMsgFn == undefined || event.target.value.trim() === "") ? "The field " + meta.text + " must be specified." :  meta.errMsgFn(event.target.value, meta);
        $errorDiv.text(errorMsg)
        $errorDiv.addClass("error");
      } else {
        $errorDiv.text("")
        $errorDiv.removeClass("error");
      }
  
    });

    //validation for dropdown box
    $select.change((event) => {
      //debugger
      if ( Boolean(meta.required) && (
          (meta.chkFn != undefined && meta.chkFn(event.target.value.trim())) === null ||
        meta.chkFn == undefined && event.target.value.trim() === "")
      ) {
        let errorMsg = (meta.errMsgFn == undefined || event.target.value.trim() === "") ? "The field " + meta.text + " must be specified." :  meta.errMsgFn(event.target.value, meta);
  
        $errorDiv.text(errorMsg)
        $errorDiv.addClass("error");
      } else {
        $errorDiv.text("")
        $errorDiv.removeClass("error");
      }
  
    });




    //debugger;
    $select.append($options);
    element.append($select)
  } else {
    meta.attr.id = makeId(path);
    const radio = makeElement('radio', attr).text(meta.text);
    const $radioButton = InputItems(meta.items, 'radio', attr);
    const $fieldset = makeElement('div', {
      class: "fieldset",
      id: id
    }).text('');
    //radio.append($radioButton);
    $fieldset.append($radioButton);
    element.append($fieldset);
  }

  const $errorDiv = makeElement('div', {
    class: "error",
    id: id
  }).text('');
  element.append($errorDiv);
  $element.append(element);

 
}


//map from type to type handling function.  
const FNS = {
  block,
  form,
  header,
  input,
  link,
  multiSelect,
  para,
  segment,
  submit,
  uniSelect,
};

/*************************** Top-Level Code ****************************/

function render(path, $element = $('body')) {
  const meta = access(path);
  if (!meta) {
    $element.append(`<p>Path ${makeId(path)} not found</p>`);
  } else {
    const type = getType(meta);
    const fn = FNS[type];
    if (fn) {
      fn(meta, path, $element);
    } else {
      $element.append(`<p>type ${type} not supported</p>`);
    }
  }
}

function go() {
  const ref = getRef() || DEFAULT_REF;
  render([ref]);
}

go();



