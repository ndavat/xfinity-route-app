import { AppRegistry } from 'react-native';
import App from './App';
import appJson from './app.json';

// Import gesture handler for web
import 'react-native-gesture-handler/lib/web.js';

const appName = appJson.expo.slug;

AppRegistry.registerComponent(appName, () => App);

// Register web only
if (typeof document !== 'undefined') {
  const rootTag = document.getElementById('root') || document.getElementById('main');
  AppRegistry.runApplication(appName, { rootTag });
}gistry } from 'react-native';
import App from './App';
import appJson from './app.json';

// Import gesture handler for web
import 'react-native-gesture-handler/lib/web.js';

AppRegistry.registerComponent(appName, () => App);

// Register web only
if (typeof document !== 'undefined') {
  const rootTag = document.getElementById('root') || document.getElementById('main');
  AppRegistry.runApplication(appName, { rootTag });
}
