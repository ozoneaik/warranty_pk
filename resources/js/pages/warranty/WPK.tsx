import React, { useState, useEffect } from 'react';
import { Head } from '@inertiajs/react';
import {
    Form, Input, DatePicker, Select, Button, Upload, Card, Typography,
    Space, Row, Col, message, Image, Modal
} from 'antd';
import {
    UploadOutlined,
    GoogleOutlined,
    FacebookOutlined,
    EyeOutlined
} from '@ant-design/icons';
import axios from 'axios';
import dayjs from 'dayjs';

const { Title, Text } = Typography;
const { Option } = Select;

const WarrantyRegistration = ({ auth, csrf_token }: { auth: any, csrf_token: any }) => {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const [uploadedFile, setUploadedFile] = useState(null);
    const [previewVisible, setPreviewVisible] = useState(false);
    const [previewImage, setPreviewImage] = useState('');

    // กำหนดสีหลักของ Pumpkin
    const primaryColor = '#F54927';
    const blackColor = '#000000';
    const whiteColor = '#FFFFFF';

    // Custom CSS styles
    const customStyles = `
        .warranty-container {
            background: linear-gradient(135deg, ${primaryColor}15, ${whiteColor});
            min-height: 100vh;
        }
        .warranty-card {
            border-radius: 16px;
            box-shadow: 0 8px 32px rgba(245, 73, 39, 0.1);
            border: 2px solid ${primaryColor}30;
        }
        .pumpkin-button {
            background: ${primaryColor};
            border-color: ${primaryColor};
            border-radius: 8px;
            height: 45px;
            font-weight: 600;
        }
        .pumpkin-button:hover {
            background: #d63916 !important;
            border-color: #d63916 !important;
        }
        .social-button {
            height: 50px;
            font-weight: 600;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        .google-button {
            background: #4285F4;
            border-color: #4285F4;
            color: white;
        }
        .facebook-button {
            background: #1877F2;
            border-color: #1877F2;
            color: white;
        }
        .upload-area {
            border: 2px dashed ${primaryColor};
            border-radius: 8px;
            background: ${primaryColor}08;
        }
        .form-label {
            color: ${blackColor};
            font-weight: 600;
            margin-bottom: 8px;
        }
        .preview-image {
            max-width: 200px;
            max-height: 200px;
            object-fit: contain;
            border-radius: 8px;
            border: 1px solid #d9d9d9;
        }
        @media (max-width: 768px) {
            .warranty-container {
                padding: 10px;
            }
            .social-buttons {
                flex-direction: column;
            }
        }
    `;

    // ตัวเลือกช่องทางการซื้อ
    const buyFromOptions = [
        'ร้านค้าออนไลน์',
        'ร้านค้าปลีก',
        'ตัวแทนจำหน่าย',
        'งานแสดงสินค้า',
        'อื่นๆ'
    ];

    // จัดการการอัปโหลดไฟล์
    const handleUpload = async (file: any) => {
        // ตรวจสอบประเภทไฟล์
        const isImage = file.type.startsWith('image/');
        if (!isImage) {
            message.error('กรุณาอัปโหลดไฟล์รูปภาพเท่านั้น!');
            return false;
        }

        // ตรวจสอบขนาดไฟล์ (5MB)
        const isLessThan5M = file.size / 1024 / 1024 < 5;
        if (!isLessThan5M) {
            message.error('ขนาดไฟล์ต้องน้อยกว่า 5MB!');
            return false;
        }

        setLoading(true);

        try {
            // สร้าง FormData สำหรับอัปโหลดไปยัง S3
            const formData = new FormData();
            formData.append('file', file);
            formData.append('_token', csrf_token);

            // เรียก API สำหรับอัปโหลดไฟล์
            const response = await axios.post('/api/upload-warranty-slip', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });

            if (response.data.success) {
                setUploadedFile({
                    url: response.data.url,
                    name: file.name
                });

                // เซ็ต preview image
                const reader = new FileReader();
                reader.onload = (e) => {
                    setPreviewImage(e.target.result);
                };
                reader.readAsDataURL(file);

                message.success('อัปโหลดไฟล์สำเร็จ!');
            } else {
                message.error('เกิดข้อผิดพลาดในการอัปโหลดไฟล์');
            }
        } catch (error) {
            console.error('Upload error:', error);
            message.error('เกิดข้อผิดพลาดในการอัปโหลดไฟล์');
        } finally {
            setLoading(false);
        }

        return false; // ป้องกันการอัปโหลดอัตโนมัติของ Ant Design
    };

    // จัดการการส่งฟอร์ม
    const handleSubmit = async (values: any) => {
        if (!uploadedFile) {
            message.error('กรุณาอัปโหลดใบประกันก่อน!');
            return;
        }

        setLoading(true);

        try {
            // เตรียมข้อมูลสำหรับส่งไปยัง API
            const warrantyData = {
                slip_url: uploadedFile.url, // URL ของไฟล์ที่อัปโหลดใน S3
                serial_number: values.serial_number,
                model_code: values.model_code,
                model_name: values.model_name,
                product_name: values.product_name,
                cust_tel: values.cust_tel,
                buy_date: values.buy_date.format('YYYY-MM-DD'),
                buy_from: values.buy_from,
                store_name: values.store_name,
                warranty_from: 'pumpkin', // ค่าคงที่
                user_id: auth.user.id, // ID ของผู้ใช้ที่ล็อกอินอยู่
                user_email: auth.user.email,
                user_name: auth.user.name
            };

            // ส่งข้อมูลไปยัง API ภายนอก
            const response = await axios.post('https://slip.pumpkin.tools/warranty', warrantyData, {
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                }
            });

            if (response.data.success || response.status === 200) {
                message.success('ลงทะเบียนรับประกันสำเร็จ!');
                form.resetFields();
                setUploadedFile(null);
                setPreviewImage('');
            } else {
                message.error('เกิดข้อผิดพลาดในการลงทะเบียน กรุณาลองใหม่อีกครั้ง');
            }
        } catch (error: any) {
            console.error('Submit error:', error);
            if (error.response) {
                // Server responded with error
                const errorMessage = error.response.data?.message || 'เกิดข้อผิดพลาดจากเซิร์ฟเวอร์';
                message.error(errorMessage);
            } else if (error.request) {
                // Network error
                message.error('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต');
            } else {
                message.error('เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ');
            }
        } finally {
            setLoading(false);
        }
    };

    // จัดการการล็อกอินด้วย Google
    const handleGoogleLogin = () => {
        window.location.href = '/auth/google';
    };

    // จัดการการล็อกอินด้วย Facebook
    const handleFacebookLogin = () => {
        window.location.href = '/auth/facebook';
    };

    // แสดงหน้า Login ถ้ายังไม่ได้ล็อกอิน
    if (!auth.user) {
        return (
            <>
                <Head title="ลงทะเบียนรับประกันสินค้า Pumpkin" />
                <style>{customStyles}</style>
                <div className="warranty-container">
                    <Row justify="center" align="middle" style={{ minHeight: '100vh' }}>
                        <Col xs={22} sm={20} md={12} lg={8}>
                            <Card className="warranty-card" style={{ padding: '20px' }}>
                                <Space direction="vertical" size="large" style={{ width: '100%', textAlign: 'center' }}>
                                    <Title level={2} style={{ color: primaryColor, marginBottom: '30px' }}>
                                        ลงทะเบียนรับประกันสินค้า
                                    </Title>
                                    <Title level={3} style={{ color: blackColor }}>
                                        PUMPKIN
                                    </Title>
                                    <Text type="secondary">
                                        กรุณาเข้าสู่ระบบเพื่อทำการลงทะเบียนรับประกันสินค้า
                                    </Text>

                                    <Space direction="vertical" size="middle" style={{ width: '100%' }} className="social-buttons">
                                        <Button
                                            className="social-button google-button"
                                            size="large"
                                            onClick={handleGoogleLogin}
                                            block
                                        >
                                            <GoogleOutlined />
                                            เข้าสู่ระบบด้วย Google
                                        </Button>

                                        <Button
                                            className="social-button facebook-button"
                                            size="large"
                                            onClick={handleFacebookLogin}
                                            block
                                        >
                                            <FacebookOutlined />
                                            เข้าสู่ระบบด้วย Facebook
                                        </Button>

                                        <Button
                                            className="social-button facebook-button"
                                            size="large"
                                            onClick={handleFacebookLogin}
                                            block
                                        >
                                            <FacebookOutlined />
                                            เข้าสู่ระบบด้วย Line
                                        </Button>
                                    </Space>
                                </Space>
                            </Card>
                        </Col>
                    </Row>
                </div>
            </>
        );
    }

    // แสดงฟอร์มลงทะเบียน
    return (
        <>
            <Head title="ลงทะเบียนรับประกันสินค้า Pumpkin" />
            <style>{customStyles}</style>
            <div className="warranty-container">
                <Row justify="center">
                    <Col xs={22} sm={20} md={16} lg={12}>
                        <Card className="warranty-card" style={{ padding: '10px' }}>
                            <Space direction="vertical" size="large" style={{ width: '100%' }}>
                                {/* Header */}
                                <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                                    <Title level={2} style={{ color: primaryColor, marginBottom: '10px' }}>
                                        ลงทะเบียนรับประกันสินค้า
                                    </Title>
                                    <Title level={3} style={{ color: blackColor, marginBottom: '5px' }}>
                                        PUMPKIN
                                    </Title>
                                    <Text type="secondary">
                                        ยินดีต้อนรับ {auth?.user?.name}
                                    </Text>
                                </div>

                                {/* Form */}
                                <Form
                                    form={form}
                                    layout="vertical"
                                    onFinish={handleSubmit}
                                    requiredMark={true}
                                    size="large"
                                >
                                    {/* อัปโหลดใบประกัน */}
                                    <Form.Item
                                        label={<span className="form-label">อัปโหลดใบประกันสินค้า</span>}
                                        required
                                    >
                                        <Upload.Dragger
                                            beforeUpload={handleUpload}
                                            showUploadList={false}
                                            className="upload-area"
                                            style={{ padding: '20px' }}
                                        >
                                            <p className="ant-upload-drag-icon">
                                                <UploadOutlined style={{ fontSize: '48px', color: primaryColor }} />
                                            </p>
                                            <p className="ant-upload-text" style={{ color: blackColor, fontSize: '16px' }}>
                                                คลิกหรือลากไฟล์รูปภาพมาที่นี่
                                            </p>
                                            <p className="ant-upload-hint" style={{ color: '#666' }}>
                                                รองรับไฟล์ JPG, PNG, GIF (ขนาดไม่เกิน 5MB)
                                            </p>
                                        </Upload.Dragger>

                                        {/* แสดงรูปภาพที่อัปโหลด */}
                                        {uploadedFile && previewImage && (
                                            <div style={{ marginTop: '16px', textAlign: 'center' }}>
                                                <Image
                                                    src={previewImage}
                                                    alt="ใบประกัน"
                                                    className="preview-image"
                                                    preview={{
                                                        mask: <EyeOutlined style={{ fontSize: '20px' }} />
                                                    }}
                                                />
                                                <br />
                                                <Text type="success" style={{ marginTop: '8px', display: 'block' }}>
                                                    ✅ อัปโหลดไฟล์เรียบร้อยแล้ว
                                                </Text>
                                            </div>
                                        )}
                                    </Form.Item>

                                    {/* เลข Serial Number */}
                                    <Form.Item
                                        name="serial_number"
                                        label={<span className="form-label">หมายเลขซีเรียล (S/N)</span>}
                                        rules={[{ required: true, message: 'กรุณากรอกหมายเลขซีเรียล' }]}
                                    >
                                        <Input placeholder="กรอกหมายเลขซีเรียลของสินค้า" />
                                    </Form.Item>

                                    {/* รหัสสินค้า */}
                                    <Form.Item
                                        name="model_code"
                                        label={<span className="form-label">รหัสสินค้า</span>}
                                        rules={[{ required: true, message: 'กรุณากรอกรหัสสินค้า' }]}
                                    >
                                        <Input placeholder="กรอกรหัสสินค้า" />
                                    </Form.Item>

                                    {/* ชื่อโมเดล */}
                                    <Form.Item
                                        name="model_name"
                                        label={<span className="form-label">ชื่อโมเดล</span>}
                                        rules={[{ required: true, message: 'กรุณากรอกชื่อโมเดล' }]}
                                    >
                                        <Input placeholder="กรอกชื่อโมเดลสินค้า" />
                                    </Form.Item>

                                    {/* ชื่อสินค้า */}
                                    <Form.Item
                                        name="product_name"
                                        label={<span className="form-label">ชื่อสินค้า</span>}
                                        rules={[{ required: true, message: 'กรุณากรอกชื่อสินค้า' }]}
                                    >
                                        <Input placeholder="กรอกชื่อสินค้า" />
                                    </Form.Item>

                                    {/* เบอร์โทรศัพท์ */}
                                    <Form.Item
                                        name="cust_tel"
                                        label={<span className="form-label">เบอร์โทรศัพท์</span>}
                                        rules={[
                                            { required: true, message: 'กรุณากรอกเบอร์โทรศัพท์' },
                                            { pattern: /^[0-9]{10}$/, message: 'เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลัก' }
                                        ]}
                                    >
                                        <Input placeholder="0812345678" />
                                    </Form.Item>

                                    {/* วันที่ซื้อ */}
                                    <Form.Item
                                        name="buy_date"
                                        label={<span className="form-label">วันที่ซื้อสินค้า</span>}
                                        rules={[{ required: true, message: 'กรุณาเลือกวันที่ซื้อสินค้า' }]}
                                    >
                                        <DatePicker
                                            placeholder="เลือกวันที่ซื้อ"
                                            style={{ width: '100%' }}
                                            format="DD/MM/YYYY"
                                            disabledDate={(current) => current && current > dayjs().endOf('day')}
                                        />
                                    </Form.Item>

                                    {/* ช่องทางการซื้อ */}
                                    <Form.Item
                                        name="buy_from"
                                        label={<span className="form-label">ช่องทางการซื้อ</span>}
                                        rules={[{ required: true, message: 'กรุณาเลือกช่องทางการซื้อ' }]}
                                    >
                                        <Select placeholder="เลือกช่องทางการซื้อ">
                                            {buyFromOptions.map((option) => (
                                                <Option key={option} value={option}>
                                                    {option}
                                                </Option>
                                            ))}
                                        </Select>
                                    </Form.Item>

                                    {/* ร้านที่ซื้อ */}
                                    <Form.Item
                                        name="store_name"
                                        label={<span className="form-label">ร้านที่ซื้อ / Platform</span>}
                                        rules={[{ required: true, message: 'กรุณากรอกชื่อร้านหรือ platform ที่ซื้อ' }]}
                                    >
                                        <Input placeholder="เช่น Lazada, Shopee, หรือชื่อร้านค้า" />
                                    </Form.Item>

                                    {/* ช่องทางลงทะเบียน (อ่านอย่างเดียว) */}
                                    <Form.Item
                                        name="warranty_from"
                                        label={<span className="form-label">ช่องทางลงทะเบียน</span>}
                                        initialValue="pumpkin"
                                    >
                                        <Input disabled value="pumpkin" />
                                    </Form.Item>

                                    {/* ปุ่มส่ง */}
                                    <Form.Item style={{ marginTop: '30px' }}>
                                        <Button
                                            type="primary"
                                            htmlType="submit"
                                            loading={loading}
                                            className="pumpkin-button"
                                            size="large"
                                            block
                                        >
                                            {loading ? 'กำลังลงทะเบียน...' : 'ลงทะเบียนรับประกัน'}
                                        </Button>
                                    </Form.Item>
                                </Form>
                            </Space>
                        </Card>
                    </Col>
                </Row>
            </div>
        </>
    );
};

export default WarrantyRegistration;