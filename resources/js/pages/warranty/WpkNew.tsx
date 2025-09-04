import { GoogleOAuthProvider } from '@react-oauth/google';
import { GoogleLogin } from '@react-oauth/google';
import { Card, Space } from 'antd';
import { jwtDecode } from "jwt-decode";

export default function WpkNew() {
    
    return (
        <Space direction='vertical'>
            <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
                <GoogleLogin
                    onSuccess={credentialResponse => {
                        if (credentialResponse.credential) {
        const decoded: any = jwtDecode(credentialResponse.credential);
        console.log("Profile:", decoded);
    }
                    }}
                    onError={() => {
                        console.log('Login Failed');
                    }}
                />
            </GoogleOAuthProvider>
        </Space>
    )
}
