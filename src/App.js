import React, {Component } from 'react';
import Checkbox from '@material-ui/core/Checkbox';
import FormGroup from '@material-ui/core/FormGroup';
import FormControlLabel from '@material-ui/core/FormControlLabel';
import FormControl from '@material-ui/core/FormControl';
import Button from '@material-ui/core/Button';
import TextField from '@material-ui/core/TextField'

import Dotfield from './Dotfield';
import Ishihara from './Ishihara';

// import logo from './logo.svg';
import './App.css';

class App extends React.Component {

  constructor(props) {
    super(props)
    this.state = {
      dots: {},
      dotSeed: 42,
      offset: {x: 200, y: 100},
      minSize: 4,
      maxSize: 23,
      padding: 1,
      drawPadding: 1,
      feather: true
    };
  }

  clickRender() {
    const seed = Math.random();
    const dd = Ishihara(750, 750, this.state.minSize, this.state.maxSize, seed);
    this.setState({
      dots: dd
    });
  }

  clickRedraw() {
    console.log("Redrawing...");
    const updatePadding = this.state.padding;
    this.setState({
      dotSeed: Math.random(),
      drawPadding: updatePadding
    })
  }

  handleCheck(name) {
    const that = this;
    return function(evt) {
      that.setState({
        [name]: evt.target.checked
      });
    }
  }

  handleChange(name, fParse) {
    const that = this;
    if(typeof(fParse) !== "function") {
      fParse = x=>x;
    }
    return function(evt) {
      let ss = fParse(evt.target.value);
      console.log("Setting "+name+" "+ss+" ("+ evt.target.value +")");
      that.setState({
        [name]: ss
      });
    }
  }

  buttonEnabledState() {

    let retVal = false;
    
    if(typeof(this.state.minSize) !== "number") {
      retVal = true;
    }
    if(typeof(this.state.maxSize) !== "number") {
      retVal = true;
    }
    if(typeof(this.state.padding) !== "number") {
      retVal = true;
    }
    if(this.state.minSize > this.state.maxSize) {
      retVal = true;
    }
    if(this.state.padding >= this.state.minSize) {
      retVal = true;
    }
    if(this.state.padding < 0) {
      retVal = true;
    }

    return retVal;
  }

  componentDidMount() {
    this.clickRender();
  }

  render() {
    return (
      <div className="App">
        <header className="App-header">
          <span>
            Ishihara Plate Generator
          </span>
        </header>
        <div className="controlPanel">
          <TextField
            id="inMinSize"
            label="Min Size"
            value={this.state.minSize}
            onChange={this.handleChange('minSize', parseInt)}
            type="number"
            margin="normal"
          />
          <br/>
          <TextField
            id="inMaxSize"
            label="Max Size"
            value={this.state.maxSize}
            onChange={this.handleChange('maxSize', parseInt)}
            type="number"
            margin="normal"
          />
          <br/>
          <TextField
            id="inPadding"
            label="Padding"
            value={this.state.padding}
            onChange={this.handleChange('padding', parseInt)}
            type="number"
            margin="normal"
          />
          <br/>
          <FormControl>
            <FormGroup>
              <FormControlLabel
                control={<Checkbox value="feather" checked={this.state.feather} onChange={this.handleCheck('feather')} color="primary" />}
                label="Feathered Border"
                labelPlacement="start"/>
            </FormGroup>
          </FormControl>
          <br/><br/>
          <Button disabled={this.buttonEnabledState()} variant="contained" color="primary" onClick={this.clickRender.bind(this)}>Render</Button>
          <br/><br/>
          <Button disabled={this.buttonEnabledState()} variant="contained" color="primary" onClick={this.clickRedraw.bind(this)}>Redraw</Button>
        </div>
        <div className="dotfield">
          <Dotfield width="750" height="750" dots={this.state.dots} seed={this.state.dotSeed} offset={this.state.offset} padding={this.state.drawPadding} bFeather={this.state.feather} />
        </div>
      </div>
    );
  }
}

export default App;