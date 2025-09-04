import { Button, Space } from 'antd';
import { GoogleLogin, useGoogleLogin } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";
import FacebookLogin from '@greatsumini/react-facebook-login';


export default function ButtonLoginList() {
    const loginWithGoogle = useGoogleLogin({
        onSuccess: credentialResponse => {
            if (credentialResponse.credential) {
                const decoded: any = jwtDecode(credentialResponse.credential);
                console.log("Profile:", decoded);
            }
        },
        onError: () => {
            console.log('Login Failed');
        }
    });

    const loginWithLine = async () => {
        const liffId = import.meta.env.VITE_LINE_LIFF_ID;
        const liff = (await import('@line/liff')).default;
        try{
            await liff.init({ liffId: liffId });
            if (!liff.isLoggedIn()) {
                liff.login();
            } else {
                const profile = await liff.getProfile();
                console.log('Line Profile:', profile);
            }
        }catch(error) {
            console.log('Line Login Failed', error);
        }
    }

    return (
        <Space direction='horizontal'>
            <Button color='blue' variant='outlined' onClick={() => loginWithGoogle()}>
                เข้าสู่ระบบด้วย Google
            </Button>

            <FacebookLogin
                appId={import.meta.env.VITE_FACEBOOK_APP_ID}
                onSuccess={(response) => {
                    console.log('Login Success!', response);
                }}
                onFail={(error) => {
                    console.log('Login Failed!', error);
                }}
                onProfileSuccess={(response) => {
                    console.log('Get Profile Success!', response);
                }}
                render={({ onClick, logout }) => (
                    <Button onClick={onClick} variant='solid' color='blue'>
                        เข้าสู่ระบบด้วย Facebook
                    </Button>
                )}
            />

            <Button onClick={() => loginWithLine()} variant='solid' color='green'>
                เข้าสู่ระบบด้วย Line
            </Button>
        </Space>
    )
}