//-*- mode: rjsx-mode;

import React from 'react';

export default class Books extends React.Component {

  constructor(props) {
    super(props);
    //@TODO other initialization
    const extraInfos = {
      submit: {
        type: 'submit',
        value: 'Create',
      },
      
    }
    
  }

  //@TODO other methods

  render() {
    //@TODO complete rendering
    return <form className="search">
      <label htmlFor="search">Search Catalog</label>
      <input name="authorsTitleSearch" id="search"/>
    </form>;
  }

}

export function Book({book, full}) {
  //@TODO return rendering of book based on full
  return '';
}

//@TODO other components like SearchForm, Results, etc.

/** text for scroll controls */
const SCROLLS = {
  next: 'Next >>',
  prev: '<< Previous',
};
