import { AppRegistry } from 'react-native';
import App from './App.web';

// Register and run the app
AppRegistry.registerComponent('TicketHub', () => App);
AppRegistry.runApplication('TicketHub', {
  rootTag: document.getElementById('root'),
});

// Hot module replacement for development
if (module.hot) {
  module.hot.accept();
}