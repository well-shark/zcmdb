import React, { useState } from 'react'
import {
  Card,
  Button,
  Upload,
  message,
  Typography,
  Space,
  Alert,
  Descriptions,
  Divider
} from 'antd'
import {
  DownloadOutlined,
  UploadOutlined,
  WarningOutlined
} from '@ant-design/icons'
import { exportDatabase, importDatabase } from '@/api/migration'
import { useAuthStore } from '@/store/auth'

const { Title, Paragraph } = Typography

const Migration = () => {
  const { user } = useAuthStore()
  const [importing, setImporting] = useState(false)
  const [fileList, setFileList] = useState([])

  // 检查是否为管理员
  if (!user?.is_admin) {
    return (
      <Alert
        message="权限不足"
        description="只有管理员可以访问数据库迁移功能"
        type="error"
        showIcon
      />
    )
  }

  const handleExport = async () => {
    try {
      message.loading('正在导出数据...', 0)
      const response = await exportDatabase()
      
      // 创建下载链接
      const dataStr = JSON.stringify(response, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `zcmdb_export_${new Date().toISOString().split('T')[0]}.json`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(url)
      
      message.destroy()
      message.success('导出成功')
    } catch (error) {
      message.destroy()
      message.error('导出失败: ' + (error.response?.data?.detail || error.message))
    }
  }

  const handleImport = async () => {
    if (fileList.length === 0) {
      message.warning('请先选择要导入的JSON文件')
      return
    }

    setImporting(true)
    try {
      const file = fileList[0].originFileObj
      const response = await importDatabase(file)
      
      message.success(
        `导入完成！成功导入: 用户${response.imported.users}个, 标签${response.imported.tags}个, 资产${response.imported.assets}个, 凭据${response.imported.credentials}个, 云账号${response.imported.cloud_accounts}个`
      )
      
      if (response.errors && response.errors.length > 0) {
        message.warning(`部分数据导入失败，共${response.errors.length}条错误`)
        console.error('导入错误:', response.errors)
      }
      
      setFileList([])
    } catch (error) {
      message.error('导入失败: ' + (error.response?.data?.detail || error.message))
    } finally {
      setImporting(false)
    }
  }

  return (
    <div>
      <Title level={2}>数据库迁移</Title>
      
      <Alert
        message="注意事项"
        description={
          <div>
            <p>1. 导出功能会将所有数据导出为JSON格式，包括加密的密码和密钥（保持加密状态）</p>
            <p>2. 导入功能会导入数据到当前数据库，已存在的数据（如用户名）会被跳过</p>
            <p>3. 导入时，资产ID、标签ID等会自动重新分配，但关联关系会保持</p>
            <p>4. 导入的用户需要重新设置密码（密码哈希不会被导入）</p>
            <p>5. 建议在导入前先备份当前数据库</p>
          </div>
        }
        type="warning"
        showIcon
        icon={<WarningOutlined />}
        style={{ marginBottom: 24 }}
      />

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <Card title="导出数据" bordered>
          <Paragraph>
            导出当前数据库的所有数据为JSON格式，可用于备份或迁移到新版本。
          </Paragraph>
          <Button
            type="primary"
            icon={<DownloadOutlined />}
            onClick={handleExport}
            size="large"
          >
            导出数据库
          </Button>
        </Card>

        <Card title="导入数据" bordered>
          <Paragraph>
            从JSON文件导入数据到当前数据库。已存在的数据（如用户名）会被跳过。
          </Paragraph>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Upload
              fileList={fileList}
              beforeUpload={() => false}
              onChange={({ fileList }) => setFileList(fileList)}
              accept=".json"
              maxCount={1}
            >
              <Button icon={<UploadOutlined />}>选择JSON文件</Button>
            </Upload>
            <Button
              type="primary"
              icon={<UploadOutlined />}
              onClick={handleImport}
              loading={importing}
              disabled={fileList.length === 0}
            >
              开始导入
            </Button>
          </Space>
        </Card>
      </Space>
    </div>
  )
}

export default Migration

