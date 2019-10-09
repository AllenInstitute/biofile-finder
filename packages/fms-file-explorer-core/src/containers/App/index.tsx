import * as React from "react";

const styles = require("./style.module.css");

export default class App extends React.Component<{}, {}> {
    public render(): JSX.Element {
        return <div className={styles.container}>Hello world</div>;
    }
}
