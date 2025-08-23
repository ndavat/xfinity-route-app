const React = require('react');

const Icon = React.forwardRef((props, ref) => {
  return React.createElement('Text', { ...props, ref, testID: props.testID || 'Icon' }, props.name);
});

module.exports = {
  MaterialIcons: Icon,
  MaterialCommunityIcons: Icon,
  Ionicons: Icon,
  FontAwesome: Icon,
  FontAwesome5: Icon,
  Feather: Icon,
  AntDesign: Icon,
  Entypo: Icon,
  EvilIcons: Icon,
  Foundation: Icon,
  Octicons: Icon,
  SimpleLineIcons: Icon,
  Zocial: Icon,
  createIconSet: () => Icon,
  createIconSetFromFontello: () => Icon,
  createIconSetFromIcoMoon: () => Icon,
  createMultiStyleIconSet: () => Icon,
};
