const latest = '0.10.1';
self.MonacoEnvironment = {
  baseUrl: 'https://cdn.jsdelivr.net/npm/monaco-editor@'+latest+'/dev/'
};
importScripts('https://cdn.jsdelivr.net/npm/monaco-editor@'+latest+'/dev/vs/base/worker/workerMain.js');