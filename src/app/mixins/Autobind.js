
function AutobindMixinFactory(methodNames) {
    return {
        componentWillMount: function() {
            methodNames.forEach((name) => {
                if (this[name] && typeof this[name] === 'function') {
                    this[name] = this[name].bind(this);
                }
            });
        }
    };
}


module.exports = AutobindMixinFactory;
