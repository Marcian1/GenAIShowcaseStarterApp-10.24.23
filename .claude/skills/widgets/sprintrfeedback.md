# Feedback

- **Widget ID:** `SprintrFeedbackWidget.SprintrFeedback`
- **Type:** PLUGGABLEWIDGET
- **Version:** 10.1.0

## MDL Example

```sql
PLUGGABLEWIDGET 'SprintrFeedbackWidget.SprintrFeedback' widget1
```

## Properties

| Property | Type | Required | Default | Values / notes | Group | Description |
|----------|------|----------|---------|----------------|-------|-------------|
| `allowScreenshot` | boolean | Yes | true |  | Project | If you don't want users to send screenshots (for legal reasons, etc.), set this to ‘No’. Mendix is the processor of data on behalf of you but not the controller of any data. |
| `submitSuccessImgUrl` | string |  |  |  | Project | You can change the url to customize the image for informing users the feedback has been submitted successfully. |
| `submitFailedImgUrl` | string |  |  |  | Project | You can change the url to customize the image for informing users the feedback has not been submitted successfully. |
| `userInfo` | enumeration | Yes | prefilled | `prefilled` \| `none` | User Info::User Info | By pre-filling the name and email address of the user it becomes easier to send feedback. |
| `userInfoEntityDS` | datasource |  |  | list | User Info::Data Source | Return the current user as a list. Due to widget limitations this needs to be list and the first item will be used. |
| `displayNameAttribute` | attribute |  |  |  | User Info::Data Source | Use AttributeName as used on the user entity. |
| `emailAddressAttribute` | attribute |  |  |  | User Info::Data Source | Email address attribute |
| `sprintrapp` | string | Yes | 1 |  | Advanced::Project settings | This is generated automatically. You can find this ID in the Developer Portal > General Settings. |
| `overrideFeedbackServerLocation` | string |  |  |  | Advanced::Project settings | You can configure a custom feedback server location, but Mendix recommends leaving this empty. Mendix will only process the data on behalf of you, for any legal reasons if you wish to get the data to your own server, please configure it. |
| `foreignObjectRendering` | boolean | Yes | false |  | Advanced::HTML2Canvas screenshot settings | Only enable this when you experience problems with creating screenshots. |
| `scrollableAreaSelector` | string |  | .mx-scrollcontainer-fixed > .mx-scrollcontainer-middle > .mx-scrollcontainer-wrapper |  | Advanced::HTML2Canvas screenshot settings | If you use internal scrolling inside of a div container, screenshot feature might not work correctly. This allows you to specify this area with the CSS selector. |
| `translation_Feedback` | textTemplate |  |  |  | Translation | Feedback |
| `translation_Modal_Title` | textTemplate |  |  |  | Translation | Share Feedback |
| `translation_Modal_Introduction_Text` | textTemplate |  |  |  | Translation | Help us make your experience better and share your feedback with us! |
| `translation_Close` | textTemplate |  |  |  | Translation | Close |
| `translation_Cancel` | textTemplate |  |  |  | Translation | Cancel |
| `translation_Clear` | textTemplate |  |  |  | Translation | Clear |
| `translation_Submit` | textTemplate |  |  |  | Translation | Submit |
| `translation_Subject` | textTemplate |  |  |  | Translation | Subject |
| `translation_Description` | textTemplate |  |  |  | Translation | Description |
| `translation_Description_Placeholder` | textTemplate |  |  |  | Translation | Description Placeholder |
| `translation_Description_Error` | textTemplate |  |  |  | Translation | Description Error |
| `translation_Attachment` | textTemplate |  |  |  | Translation | Attachment |
| `translation_Email_Address` | textTemplate |  |  |  | Translation | Email |
| `translation_Email_Invalid` | textTemplate |  |  |  | Translation | Email is Invalid |
| `translation_Email_Description_Placeholder` | textTemplate |  |  |  | Translation | Email Placeholder |
| `translation_Your_email_address_is_optional` | textTemplate |  |  |  | Translation | Your email address... |
| `translation_Done` | textTemplate |  |  |  | Translation | Done |
| `translation_Enter_screenshot_mode` | textTemplate |  |  |  | Translation | Enter screenshot mode |
| `translation_Upload_from_computer` | textTemplate |  |  |  | Translation | Upload from computer |
| `translation_File_Size` | textTemplate |  |  |  | Translation | Maximum size is 5MB. |
| `translation_Take_screenshot` | textTemplate |  |  |  | Translation | Take screenshot |
| `translation_Screenshot_Image_Alt_Text` | textTemplate |  |  |  | Translation | Screenshot alt text |
| `translation_Annotate` | textTemplate |  |  |  | Translation | Annotate |
| `translation_Summarize_feedback_item` | textTemplate |  |  |  | Translation | Summarize your feedback... |
| `translation_Add_as_many_details_as_you_can` | textTemplate |  |  |  | Translation | Add as many details as... |
| `translation_Use_Screenshot_mode_to_take_a_snapshot` | textTemplate |  |  |  | Translation | Use Screenshot mode to... |
| `translation_Include_a_screenshot_of_the_current_page` | textTemplate |  |  |  | Translation | Include a screenshot... |
| `translation_Screenshots_have_been_disabled_for_the_feedback_mode` | textTemplate |  |  |  | Translation | Screenshots have bee... |
| `translation_Error` | textTemplate |  |  |  | Translation | Error |
| `translation_Sending_feedback` | textTemplate |  |  |  | Translation | Sending... |
| `translation_Outro_Title` | textTemplate |  |  |  | Translation | Feedback Submitted! |
| `translation_Outro_Paragraph` | textTemplate |  |  |  | Translation | Thanks for sharing... |
| `translation_Error_creating_a_screenshot` | textTemplate |  |  |  | Translation | Error creating a scr... |
| `translation_Submit_Feedback_Error_Title` | textTemplate |  |  |  | Translation | Error title feedback |
| `translation_Submit_Feedback_Error_Message` | textTemplate |  |  |  | Translation | Error message feedback |
| `translation_Field_Required` | textTemplate |  |  |  | Translation | This Field is Required |

---

Regenerated by `mxcli widget docs` and by `refresh catalog`. For the same data live from the `.mpk` — including anything added by a widget upgrade since this file was written — run `mxcli widget describe sprintrfeedback -p <app.mpr>`.
