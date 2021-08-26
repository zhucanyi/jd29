# 通过reposync方式进行代码同步

### 导入我的仓库

[点击导入仓库](https://github.com/new/import)

`URL框`填写`https://github.com/inoyna12/jd28`

`Repository Name`填写仓库名字(随意设置)，点击`Begin import`，等待导入完成(不要把仓库设为私有，会运行失败)。


### 申请PAT

点击 GitHub [用户设置页面](https://github.com/settings) 最下方的`Developer setting` ，然后选择 [`Personal access tokens`(点击快捷到达指定页面)](https://github.com/settings/tokens/new) 来生成一个 token，把 `repo`和`workflow` 两部分勾上即可。

![image-20201111142402212](assets/new_access_token.png)

点击最下面的创建按钮后，图示部分即为你的PAT(图示的已经删除了,仅为演示)，复制下来马上就要使用了

![image-20201111145314326](assets/your_new_token.png)



### 填写PAT到Secrets

申请完毕后，在分支中点击`Settings`-`Secrets`-`New secret`

<img src="assets/new_repository_secret.png" alt="set_up_workflow" style="zoom:80%;" />

`name`填`PAT`，`Value`填入上方申请到的PAT,保存即可

![image-20201111144804807](assets/set_sectet_pat.png)





三:申请完毕后，在新仓库分支中点击Settings-Secrets-New secret，name填PAT，框里面填写你第二步复制的PAT,保存即可。
接着再点击New secret，name填JD_COOKIE，框里面填写你的账号cookie，多账号换行。




四:点击仓库的Code，把上方的Star点亮，完毕
