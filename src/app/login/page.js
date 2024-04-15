import Image from "next/image"
import styles from "./styles/styles.module.css"
import logo from "@/assets/images/logo.png"

const Login = () => {
    return (
        <div className={styles.login}>
            <div>
                <Image src={logo} alt="logo" width={70} height={89} style={{marginBottom: "1.5rem"}}/>

                <h5>Amni&#39;s Contractor Registration Portal Page.</h5>

                <div className={styles.content}>
                    <h3>Log In</h3>

                    <input placeholder="Email" />
                    <input placeholder="Password" type="password"/>

                    <div>
                        <div>
                            <input type="checkbox" />
                            <label>Remember me</label>
                        </div>
                    </div>

                    <button>Login</button>

                    <footer>
                        <span>Forgot password?</span>

                        <a>Reset</a>
                    </footer>
                </div>
            </div>
        </div>
    )
}

export default Login