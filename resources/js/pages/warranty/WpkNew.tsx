import React, { useState, useEffect } from 'react';
import {
    Form, Input, Button, Upload, DatePicker, Select, Space, Typography,
    Card, Row, Col, message, Image, Divider
} from 'antd';
import {
    GoogleOutlined, MessageOutlined, FacebookOutlined,
    PictureOutlined, DeleteOutlined
} from '@ant-design/icons';
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google';
// import FacebookLogin from 'react-facebook-login/dist/facebook-login-render-props';
import axios from 'axios';

const { Title, Text } = Typography;
const { Option } = Select;

const WpkNew = () => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [isLoggedIn, setIsLoggedIn] = useState(false);
    const [user, setUser] = useState(null);
    const [uploadedImage, setUploadedImage] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);

    // กำหนดค่า config (ใส่ข้อมูลจริงของคุณ)
    const socialConfig = {
        google: {
            clientId: import.meta.env.VITE_GOOGLE_CLIENT_ID
        },
        facebook: {
            appId: import.meta.env.VITE_FACEBOOK_APP_ID
        },
        line: {
            channelId: import.meta.env.VITE_LINE_CHANNEL_ID
        }
    };

    const colors = {
        primary: '#F54927',
        black: '#000000',
        white: '#FFFFFF'
    };

    // ตั้งค่า axios base URL
    axios.defaults.baseURL = 'http://localhost:8000/api';
    axios.defaults.withCredentials = true;

    // ฟังก์ชันส่งข้อมูล login ไป Laravel
    const sendLoginData = async (provider, userData) => {
        try {
            setLoading(true);

            const response = await axios.post('/auth/social-login', {
                provider: provider,
                user_data: userData
            });

            if (response.data.success) {
                setUser(response.data.user);
                setIsLoggedIn(true);

                // เก็บ token ถ้ามี
                if (response.data.token) {
                    localStorage.setItem('auth_token', response.data.token);
                    axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
                }

                // ตั้งค่าข้อมูลเริ่มต้นในฟอร์ม
                form.setFieldsValue({
                    cust_tel: response.data.user.phone || '',
                    warranty_from: 'pumpkin'
                });

                message.success(`เข้าสู่ระบบด้วย ${provider} สำเร็จ!`);
            } else {
                message.error('เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
            }
        } catch (error) {
            console.error('Login error:', error);
            message.error('เกิดข้อผิดพลาดในการเข้าสู่ระบบ');
        } finally {
            setLoading(false);
        }
    };

    // Google Login Success
    const handleGoogleSuccess = async (credentialResponse) => {
        try {
            // Decode JWT token from Google
            const credential = credentialResponse.credential;
            const base64Url = credential.split('.')[1];
            const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
            const jsonPayload = decodeURIComponent(atob(base64).split('').map(function (c) {
                return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
            }).join(''));

            const googleUser = JSON.parse(jsonPayload);

            const userData = {
                id: googleUser.sub,
                name: googleUser.name,
                email: googleUser.email,
                picture: googleUser.picture
            };

            await sendLoginData('google', userData);
        } catch (error) {
            console.error('Google login error:', error);
            message.error('เกิดข้อผิดพลาดในการเข้าสู่ระบบด้วย Google');
        }
    };

    // Facebook Login Success
    const handleFacebookSuccess = async (response) => {
        if (response.accessToken) {
            const userData = {
                id: response.id,
                name: response.name,
                email: response.email,
                picture: response.picture?.data?.url
            };

            await sendLoginData('facebook', userData);
        } else {
            message.error('การเข้าสู่ระบบ Facebook ล้มเหลว');
        }
    };

    // LINE Login (เปิด popup window)
    const handleLineLogin = () => {
        const lineAuthUrl = `https://access.line.me/oauth2/v2.1/authorize?` +
            `response_type=code&` +
            `client_id=${socialConfig.line.channelId}&` +
            `redirect_uri=${encodeURIComponent(window.location.origin + '/auth/line/callback')}&` +
            `state=12345&` +
            `scope=profile%20openid%20email`;

        const popup = window.open(lineAuthUrl, 'lineLogin', 'width=500,height=600');

        // รอฟัง callback จาก popup
        const checkClosed = setInterval(() => {
            if (popup.closed) {
                clearInterval(checkClosed);
                // ตรวจสอบว่า login สำเร็จหรือไม่
                // (ในกรณีจริงจะต้องจัดการ callback URL)
            }
        }, 1000);
    };

    // จัดการการอัปโหลดไฟล์
    const handleUpload = (file) => {
        const isImage = file.type.startsWith('image/');
        if (!isImage) {
            message.error('กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น!');
            return false;
        }

        const isLt5M = file.size / 1024 / 1024 < 5;
        if (!isLt5M) {
            message.error('ขนาดไฟล์ต้องไม่เกิน 5MB!');
            return false;
        }

        const reader = new FileReader();
        reader.onload = (e) => {
            setImagePreview(e.target.result);
        };
        reader.readAsDataURL(file);

        setUploadedImage(file);
        message.success('อัปโหลดไฟล์สำเร็จ!');
        return false;
    };

    // ลบรูปภาพ
    const removeImage = () => {
        setUploadedImage(null);
        setImagePreview(null);
        form.setFieldsValue({ slip: null });
    };

    // ส่งฟอร์มลงทะเบียนประกัน
    const onFinish = async (values) => {
        setLoading(true);

        try {
            if (!uploadedImage) {
                message.error('กรุณาอัปโหลดใบประกันก่อน');
                setLoading(false);
                return;
            }

            // สร้าง FormData สำหรับอัปโหลดไฟล์
            const formData = new FormData();
            formData.append('slip', uploadedImage);

            // เพิ่มข้อมูลอื่นๆ
            Object.keys(values).forEach(key => {
                if (values[key]) {
                    formData.append(key, values[key]);
                }
            });

            // ส่งข้อมูลไป API
            const response = await axios.post('/warranty/register', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                }
            });

            if (response.data.success) {
                message.success('ลงทะเบียนรับประกันสำเร็จ!');
                form.resetFields();
                setUploadedImage(null);
                setImagePreview(null);
            } else {
                message.error(response.data.message || 'เกิดข้อผิดพลาด');
            }

        } catch (error) {
            console.error('Registration error:', error);
            message.error('เกิดข้อผิดพลาดในการลงทะเบียน');
        } finally {
            setLoading(false);
        }
    };

    // หากยังไม่ได้ login
    if (!isLoggedIn) {
        return (
            <GoogleOAuthProvider clientId={socialConfig.google.clientId}>
                <div className="min-h-screen bg-gradient-to-br from-white to-gray-50 p-4">
                    <div className="text-center mb-8 pt-5">
                        <div className="text-3xl font-bold mb-2" style={{ color: colors.primary }}>
                            🎃 PUMPKIN
                        </div>
                        <h2 className="text-2xl font-bold text-black mb-2">
                            ลงทะเบียนรับประกันสินค้า
                        </h2>
                        <p className="text-gray-500">กรุณาเข้าสู่ระบบเพื่อดำเนินการต่อ</p>
                    </div>

                    <Card className="max-w-sm mx-auto rounded-xl shadow-lg">
                        <Space direction="vertical" size="large" className="w-full">

                            {/* Google Login */}
                            <div className="w-full">
                                <GoogleLogin
                                    onSuccess={handleGoogleSuccess}
                                    onError={() => message.error('Google login failed')}
                                    useOneTap
                                    render={(renderProps) => (
                                        <Button
                                            className="w-full h-11 rounded-lg text-base font-medium"
                                            style={{
                                                backgroundColor: '#DB4437',
                                                borderColor: '#DB4437',
                                                color: 'white'
                                            }}
                                            icon={<GoogleOutlined />}
                                            loading={loading}
                                            onClick={renderProps.onClick}
                                            disabled={renderProps.disabled}
                                        >
                                            เข้าสู่ระบบด้วย Google
                                        </Button>
                                    )}
                                />
                            </div>

                            {/* LINE Login */}
                            <Button
                                className="w-full h-11 rounded-lg text-base font-medium"
                                style={{
                                    backgroundColor: '#00B900',
                                    borderColor: '#00B900',
                                    color: 'white'
                                }}
                                icon={<MessageOutlined />}
                                loading={loading}
                                onClick={handleLineLogin}
                            >
                                เข้าสู่ระบบด้วย Line
                            </Button>

                            {/* Facebook Login */}
                            {/* <FacebookLogin
                                appId={socialConfig.facebook.appId}
                                autoLoad={false}
                                fields="name,email,picture"
                                callback={handleFacebookSuccess}
                                render={(renderProps) => (
                                    <Button
                                        className="w-full h-11 rounded-lg text-base font-medium"
                                        style={{
                                            backgroundColor: '#1877F2',
                                            borderColor: '#1877F2',
                                            color: 'white'
                                        }}
                                        icon={<FacebookOutlined />}
                                        loading={loading}
                                        onClick={renderProps.onClick}
                                    >
                                        เข้าสู่ระบบด้วย Facebook
                                    </Button>
                                )}
                            /> */}
                        </Space>
                    </Card>
                </div>
            </GoogleOAuthProvider>
        );
    }

    // หน้าฟอร์มลงทะเบียน (เหมือนเดิม แต่มี real data จาก login)
    return (
        <div className="min-h-screen bg-gradient-to-br from-white to-gray-50 p-4">
            <div className="text-center mb-8 pt-5">
                <div className="text-3xl font-bold mb-2" style={{ color: colors.primary }}>
                    🎃 PUMPKIN
                </div>
                <h2 className="text-2xl font-bold text-black mb-2">
                    ลงทะเบียนรับประกันสินค้า
                </h2>
                <p className="text-gray-500">สวัสดี {user?.name} กรุณากรอกข้อมูลด้านล่าง</p>
            </div>

            <Card className="max-w-2xl mx-auto rounded-xl shadow-lg">
                <Form
                    form={form}
                    layout="vertical"
                    onFinish={onFinish}
                    initialValues={{
                        warranty_from: 'pumpkin',
                        cust_tel: user?.phone || ''
                    }}
                >
                    {/* Upload Section */}
                    <Form.Item
                        label={<span className="text-base font-semibold">อัปโหลดใบประกัน *</span>}
                        name="slip"
                        rules={[{ required: true, message: 'กรุณาอัปโหลดใบประกัน' }]}
                    >
                        <div>
                            {!imagePreview ? (
                                <Upload.Dragger
                                    accept="image/*"
                                    beforeUpload={handleUpload}
                                    showUploadList={false}
                                    className="rounded-lg border-2 border-dashed bg-white text-center p-8 cursor-pointer transition-all duration-300 hover:border-opacity-70"
                                    style={{ borderColor: colors.primary }}
                                >
                                    <p className="text-center">
                                        <PictureOutlined style={{ fontSize: '48px', color: colors.primary }} />
                                    </p>
                                    <p className="text-lg font-medium text-black mb-1">
                                        คลิกหรือลากไฟล์มาวางที่นี่
                                    </p>
                                    <p className="text-gray-600">
                                        รองรับไฟล์รูปภาพ (PNG, JPG, JPEG) ขนาดไม่เกิน 5MB
                                    </p>
                                </Upload.Dragger>
                            ) : (
                                <div className="text-center">
                                    <Image
                                        src={imagePreview}
                                        alt="ใบประกัน"
                                        className="max-w-full max-h-48 rounded-lg mt-2"
                                    />
                                    <div className="mt-2">
                                        <Button
                                            type="primary"
                                            danger
                                            icon={<DeleteOutlined />}
                                            onClick={removeImage}
                                        >
                                            ลบรูปภาพ
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </Form.Item>

                    <Divider />

                    {/* Form Fields */}
                    <Row gutter={[16, 16]}>
                        <Col xs={24} sm={12}>
                            <Form.Item
                                label={<span className="font-semibold">เลข S/N (Serial Number) *</span>}
                                name="serial_number"
                                rules={[{ required: true, message: 'กรุณากรอกเลข S/N' }]}
                            >
                                <Input placeholder="กรอกเลข Serial Number" size="large" className="rounded-lg" />
                            </Form.Item>
                        </Col>

                        <Col xs={24} sm={12}>
                            <Form.Item
                                label={<span className="font-semibold">รหัสสินค้า (Model Code) *</span>}
                                name="model_code"
                                rules={[{ required: true, message: 'กรุณากรอกรหัสสินค้า' }]}
                            >
                                <Input placeholder="กรอกรหัสสินค้า" size="large" className="rounded-lg" />
                            </Form.Item>
                        </Col>

                        <Col xs={24} sm={12}>
                            <Form.Item
                                label={<span className="font-semibold">ชื่อโมเดล (Model Name) *</span>}
                                name="model_name"
                                rules={[{ required: true, message: 'กรุณากรอกชื่อโมเดล' }]}
                            >
                                <Input placeholder="กรอกชื่อโมเดล" size="large" className="rounded-lg" />
                            </Form.Item>
                        </Col>

                        <Col xs={24} sm={12}>
                            <Form.Item
                                label={<span className="font-semibold">ชื่อสินค้า (Product Name) *</span>}
                                name="product_name"
                                rules={[{ required: true, message: 'กรุณากรอกชื่อสินค้า' }]}
                            >
                                <Input placeholder="กรอกชื่อสินค้า" size="large" className="rounded-lg" />
                            </Form.Item>
                        </Col>

                        <Col xs={24} sm={12}>
                            <Form.Item
                                label={<span className="font-semibold">เบอร์โทรศัพท์ *</span>}
                                name="cust_tel"
                                rules={[
                                    { required: true, message: 'กรุณากรอกเบอร์โทรศัพท์' },
                                    { pattern: /^[0-9]{10}$/, message: 'เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลัก' }
                                ]}
                            >
                                <Input placeholder="0901234567" size="large" className="rounded-lg" />
                            </Form.Item>
                        </Col>

                        <Col xs={24} sm={12}>
                            <Form.Item
                                label={<span className="font-semibold">วันที่ซื้อ *</span>}
                                name="buy_date"
                                rules={[{ required: true, message: 'กรุณาเลือกวันที่ซื้อ' }]}
                            >
                                <DatePicker
                                    placeholder="เลือกวันที่ซื้อ"
                                    size="large"
                                    className="w-full rounded-lg"
                                    format="DD/MM/YYYY"
                                />
                            </Form.Item>
                        </Col>

                        <Col xs={24} sm={12}>
                            <Form.Item
                                label={<span className="font-semibold">ซื้อจากช่องทางไหน *</span>}
                                name="buy_from"
                                rules={[{ required: true, message: 'กรุณาเลือกช่องทางที่ซื้อ' }]}
                            >
                                <Select placeholder="เลือกช่องทางที่ซื้อ" size="large" className="rounded-lg">
                                    <Option value="online">ออนไลน์</Option>
                                    <Option value="store">ร้านค้า</Option>
                                    <Option value="dealer">ตัวแทนจำหน่าย</Option>
                                    <Option value="exhibition">งานแสดงสินค้า</Option>
                                </Select>
                            </Form.Item>
                        </Col>

                        <Col xs={24} sm={12}>
                            <Form.Item
                                label={<span className="font-semibold">ชื่อร้าน/แพลตฟอร์ม *</span>}
                                name="store_name"
                                rules={[{ required: true, message: 'กรุณากรอกชื่อร้าน/แพลตฟอร์ม' }]}
                            >
                                <Input placeholder="เช่น Shopee, Lazada, ร้านค้า ABC" size="large" className="rounded-lg" />
                            </Form.Item>
                        </Col>

                        <Col xs={24}>
                            <Form.Item
                                label={<span className="font-semibold">ช่องทางลงทะเบียน</span>}
                                name="warranty_from"
                            >
                                <Input
                                    value="pumpkin"
                                    disabled
                                    size="large"
                                    className="rounded-lg bg-gray-100 font-bold"
                                    style={{ color: colors.primary }}
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Divider />

                    <Form.Item>
                        <Button
                            type="primary"
                            htmlType="submit"
                            loading={loading}
                            className="w-full h-12 rounded-lg text-lg font-semibold"
                            style={{
                                backgroundColor: colors.primary,
                                borderColor: colors.primary
                            }}
                        >
                            {loading ? 'กำลังลงทะเบียน...' : 'ลงทะเบียนรับประกัน'}
                        </Button>
                    </Form.Item>
                </Form>
            </Card>
        </div>
    );
};

export default WpkNew;