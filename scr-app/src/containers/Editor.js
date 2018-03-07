import React, {Component} from 'react';
import PropTypes from "prop-types";
import classNames from 'classnames';
import {withStyles} from 'material-ui/styles';
import Button from 'material-ui/Button';
import CloseIcon from 'material-ui-icons/Close';
// import WarningIcon from 'material-ui-icons/Warning';
import ErrorOutlineIcon from 'material-ui-icons/ErrorOutline';
import SettingsIcon from 'material-ui-icons/Settings';
import Snackbar from 'material-ui/Snackbar';
import {mountEditorFulfilled} from "../redux/modules/monacoEditor";
import ExpressionPopover from "./ExpressionPopover";
import {monacoEditorMouseEventTypes} from "../utils/monacoUtils";

const styles=theme => ({
  container: {
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
  editor: {
    height: '100%'
  },
  menuButton: {
    marginLeft: -12,
    marginRight: 20,
  },
  button: {
    marginBottom: theme.spacing.unit,
  },
  fab: {
    position: 'absolute',
    bottom: theme.spacing.unit * 2,
    right: theme.spacing.unit * 2,
  },
  fabMoveUp: {
    transform: 'translate3d(0, -46px, 0)',
    transition: theme.transitions.create('transform', {
      duration: theme.transitions.duration.enteringScreen,
      easing: theme.transitions.easing.easeOut,
    }),
  },
  fabMoveDown: {
    transform: 'translate3d(0, 0, 0)',
    transition: theme.transitions.create('transform', {
      duration: theme.transitions.duration.leavingScreen,
      easing: theme.transitions.easing.sharp,
    }),
  },
  snackbar: {
    position: 'absolute',
  },
  snackbarContent: {
    maxWidth: 'inherit',
    width: '100%',
  },
});

class Editor extends Component {
  state={
    settingsOpen: false,
    errorSnackbarOpen: false,
    anchorEl: null,
    mouseEvent: null,
    ignoreFirstEvent: false,
    errors: null,
  };
  monacoEditor=null;
  maxLineNumber=-1;
  
  handleClick=() => {
    this.setState(prevState =>
      ({errorSnackbarOpen: !prevState.errorSnackbarOpen})
    );
  };
  
  handleClose=() => {
    this.setState({errorSnackbarOpen: false});
  };
  
  setMonacoEditor= monacoEditor =>{
    this.monacoEditor = monacoEditor;
  };
  
  onContentChangedAction =()=>{};
  
  lineNumbers=lineNumber => {
    //observer.next(lineNumber);
    // console.log("l", lineNumber);
    if (lineNumber === 1) { // is refresh
      this.maxLineNumber=1;
    }
    if (lineNumber > this.maxLineNumber) {
      this.maxLineNumber=lineNumber;
    }
    
    return `<div><div class="line-number-${lineNumber}"></div><div>
${lineNumber}</div></div>`;
  };
  
  
  getElementbyLineNumber =lineNumber =>{
    if(!lineNumber ||lineNumber>this.maxLineNumber){
      return null;
    }
    return document.getElementById(`.line-number-${lineNumber}`);
  };
  
  addBranchNavigator=(expression, lineNumber)=>{
    const el = this.getElementbyLineNumber(lineNumber);
    if(el){
    
    }
  };
  
  render() {
    const {editorId, classes}=this.props;
    const {settingsOpen, errorSnackbarOpen, anchorEl, mouseEvent, errors}=this.state;
    const fabClassName=classNames(classes.fab, errorSnackbarOpen ? classes.fabMoveUp : classes.fabMoveDown);
    
    // console.log(this.state);
    return (<div className={classes.container}>
      <div id={editorId} ref={el => {
        this.editorDiv=el
      }} className={classes.editor}></div>
      <ExpressionPopover anchorEl={anchorEl} mouseEvent={mouseEvent}/>
      <Snackbar
        open={errorSnackbarOpen}
        onClose={this.handleClose}
        SnackbarContentProps={{
          'aria-describedby': 'snackbar-fab-message-id',
          className: classes.snackbarContent,
        }}
        message={<span id="snackbar-fab-message-id"><ErrorOutlineIcon
          color="error"/><span>{JSON.stringify(errors)}</span></span>}
        action={
          <Button size="small" color="inherit" onClick={this.handleClose}>
            <CloseIcon/>
          </Button>
        }
        className={classes.snackbar}
      />
      {settingsOpen ?
        (
          <Button variant="fab" mini color="secondary" aria-label="settings"
                  className={fabClassName}
                  onClick={this.handleClick}>
            <SettingsIcon/>
          </Button>)
        : null
      }
    </div>);
  }
  
  componentDidMount() {
    this.unsubscribes=[];
    const {editorId}=this.props;
    const {store}=this.context;
    this.onContentChangedAction =action =>{
      store.dispatch(action);
    };
    store.dispatch(mountEditorFulfilled(this.props.editorId, this));
    const unsubscribe0=store.subscribe(() => {
      const currentErrors=store.getState().updatePlaygroundReducer.runtimeErrors ? store.getState().updatePlaygroundReducer.runtimeErrors[editorId] : null;
      if (currentErrors !== this.state.errors) {
        if (currentErrors) {
          console.log("rrrrrrr", currentErrors.loc, currentErrors.stack);
        } else {
          console.log("EMPTY");
        }
        
        this.setState({
          errorSnackbarOpen: !!currentErrors,
          errors: currentErrors,
        });
      }
    });
    this.unsubscribes.push(unsubscribe0);
  }
  
  componentWillUnmount() {
    for (const i in this.unsubscribes) {
      this.unsubscribes[i]();
    }
  }
  
  
  dispatchMouseEvents=monacoEditorMouseEventsObservable => {
    const {observeMouseEvents}=this.props;
    if(monacoEditorMouseEventsObservable){
      this.monacoEditorMouseEventsObservable =monacoEditorMouseEventsObservable;
    }
    
    if(!observeMouseEvents||!this.monacoEditorMouseEventsObservable){
      return;
    }
   
    const unsubscribe4=
      this.monacoEditorMouseEventsObservable
        .debounceTime(500)
        .subscribe(mouseEvent => {
          switch (mouseEvent.type) {
            case monacoEditorMouseEventTypes.mouseMove:
              this.setState({
                anchorEl: mouseEvent.event.target.element,
                mouseEvent: mouseEvent,
                ignoreFirstEvent: true
              });
              break;
            case monacoEditorMouseEventTypes.mouseDown:
              this.setState({anchorEl: null, mouseEvent: null});
              break;
            case monacoEditorMouseEventTypes.contextMenu:
              this.setState({anchorEl: null, mouseEvent: null});
              break;
            case monacoEditorMouseEventTypes.mouseLeave:
              // avoids popover's enter-leave events on open
              const {ignoreFirstEvent}=this.state;
              if (ignoreFirstEvent) {
                this.setState({ignoreFirstEvent: false});
              } else {
                this.setState({anchorEl: null, mouseEvent: null});
              }
              break;
            default:
          }
        });
    this.unsubscribes.push(unsubscribe4);
  };
}

Editor.contextTypes={
  store: PropTypes.object.isRequired
};

Editor.propTypes={
  editorId: PropTypes.string.isRequired,
  classes: PropTypes.object.isRequired,
};

export default withStyles(styles)(Editor);
