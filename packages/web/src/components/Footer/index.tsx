import classNames from "classnames";
import * as React from "react";

import styles from "./Footer.module.css";

export default function Footer() {
    return (
        <div className={styles.footer}>
            {/* OneTrust Cookies Settings button start */}
            <a id="ot-sdk-btn" className={classNames("ot-sdk-show-settings", styles.footerLink)}>
                Cookie settings
            </a>
            {/* OneTrust Cookies Settings button end */}
        </div>
    );
}
