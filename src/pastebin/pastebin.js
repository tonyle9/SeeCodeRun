/* global Split */
import {inject, DOM} from 'aurelia-framework';
import {EventAggregator} from 'aurelia-event-aggregator';
import {Router} from 'aurelia-router';

import {TraceModel} from '../traceService/trace-model';
import {AceUtils} from '../utils/ace-utils';
import {FirebaseManager} from "../persistence/firebase-manager";

import {NavigationBar} from '../layout/navigationBar/navigation-bar';

import {HtmlEditor} from '../htmlEditor/html-editor';
import {CssEditor} from '../cssEditor/css-editor';
import {JsEditor} from '../jsEditor/js-editor';
import {JsGutter} from '../jsGutter/js-gutter';
import {HtmlViewer} from '../htmlViewer/html-viewer';
import {HistoryViewer} from '../historyViewer/history-viewer';
import {VisViewer} from '../visViewer/vis-viewer';
import {ConsoleWindow} from '../consoleWindow/console-window';

import {TraceViewController} from '../traceView/trace-view-controller';
import {ExpressionSelection} from '../expressionSelection/expression-selection';
import {TraceSearch} from '../traceSearch/trace-search';
import {TraceSearchHistory} from '../traceSearch/trace-search-history';
import {TracePlay} from '../tracePlay/play';

import {customElement} from 'aurelia-framework';

import $ from 'jquery';
import { resizable } from 'jquery-ui';

@customElement('pastebin')
@inject(EventAggregator, Router, TraceModel, AceUtils, FirebaseManager, DOM.Element)
export class Pastebin {

  constructor(eventAggregator, router, traceModel, aceUtils, firebaseManager, domElement) {
    this.eventAggregator = eventAggregator;
    this.router = router;
    this.traceModel = traceModel;
    this.aceUtils = aceUtils;
    this.firebaseManager = firebaseManager;
    this.domElement = domElement;
    this.heading = 'Pastebin';
    this.navigationBar = new NavigationBar(firebaseManager);

    this.consoleWindow = new ConsoleWindow(eventAggregator);
    
    this.jsEditor = new JsEditor(eventAggregator, firebaseManager);
    this.jsGutter = new JsGutter(eventAggregator);
    this.htmlEditor = new HtmlEditor(eventAggregator, firebaseManager);
    this.cssEditor  = new CssEditor(eventAggregator, firebaseManager);
    
    this.htmlEditorHistoryViewer = new HistoryViewer(this.htmlEditor, eventAggregator);
    this.htmlViewer = new HtmlViewer(eventAggregator, traceModel);
    this.visViewer  =new VisViewer(eventAggregator);

    this.traceViewController = new TraceViewController(eventAggregator, aceUtils);
    this.expressionSelection = new ExpressionSelection(eventAggregator);
    this.tracePlay = new TracePlay(eventAggregator, traceModel, aceUtils);
    
    this.traceSearch = new TraceSearch(eventAggregator, traceModel, aceUtils);
    this.traceSearchHistory = new TraceSearchHistory(eventAggregator, firebaseManager);
  }

  activate(params) {
    this.firebaseManager.activate(params.id);
    if(!params.id){
      window.history.replaceState({}, null, window.location + "#"+ this.firebaseManager.pastebinId);
    }
  }
  
  bind(){
    
  }

  attached() {
    
    Split(['#main-splitter-left', '#main-splitter-right'], {
          sizes: [50, 50],
          gutterSize: 3,
          cursor: 'col-resize',
          minSize: 250
    });
    
    this.consoleWindow.attached();
    
    this.jsEditor.attached();
    this.jsGutter.attached();
    this.htmlEditor.attached();
    this.cssEditor.attached();
    
    this.htmlEditorHistoryViewer.attached();
    
    this.htmlViewer.attached();
    this.visViewer.attached();
    
    Split(['#right-splitter-top', '#right-splitter-bottom'], {
          direction: 'vertical',
          sizes: [90, 10],
          gutterSize: 3,
          cursor: 'row-resize',
          minSize: 100
    });
    
    this.traceViewController.attached();
    this.tracePlay.attached();
    this.traceSearch.attached();
    this.traceSearchHistory.attached();
    
    
    this.navigationBar.attached();
    
    $('.panel-heading').click();
    
    let gutterSplit = function (){
      $("#js-editor-code").resizable(
    {
        maxWidth: $("#main-splitter-left").width() - 100,
        autoHide: false,
        handles: 'e, w'
    });
    
    };
    gutterSplit();
    // this.eventAggregator.subscribe("jsGutterUpdated", payload =>{
    //   gutterSplit();
    // });
  }

}
