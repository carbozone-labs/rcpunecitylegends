/* eslint-disable @typescript-eslint/no-explicit-any -- Supabase row payloads are currently generated dynamically; replace with Database types in a follow-up. */
import { adminAuthClient, authClient, type BrowserAuthClient } from "@/lib/supabase/browser";
export type EventRow={id:string;title:string;slug:string;description:string;image_url:string|null;category:string;starts_at:string;ends_at:string;venue:string|null;location:string|null;registration_deadline:string|null;capacity:number|null;status:string};
export type TaskRow={id:string;title:string;description:string;priority:string;due_at:string|null;status:string;created_at:string};
export type DirectoryRow={full_name:string;profile_photo_url:string|null;designation:string|null;committee:string|null;skills:string[];bio:string|null};
export type AnnouncementRow={id:string;title:string;message:string;category:string;priority:string;published_at:string|null;expires_at:string|null};
export type DocumentRow={id:string;title:string;description:string;category:string;storage_path:string;mime_type:string;file_size:number;audience:string;created_at:string};
const createOperations=(client:BrowserAuthClient)=>{
const get=(table:string,query:string)=>client.data<any[]>(`/rest/v1/${table}?${query}`);
const post=(table:string,body:unknown,prefer="return=representation")=>client.data<any[]>(`/rest/v1/${table}`,{method:"POST",headers:{Prefer:prefer},body:JSON.stringify(body)});
const patch=(table:string,query:string,body:unknown)=>client.data<any[]>(`/rest/v1/${table}?${query}`,{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify(body)});
return {
 events:()=>get("events",`select=*&status=eq.published&starts_at=gte.${encodeURIComponent(new Date().toISOString())}&order=starts_at.asc`),
 myRegistrations:()=>get("event_registrations","select=id,event_id,status,registered_at,cancelled_at,events(title,starts_at,ends_at,venue)&order=registered_at.desc"),
 register:(id:string)=>client.data<string>("/rest/v1/rpc/register_for_event",{method:"POST",body:JSON.stringify({target_event:id})}),
 cancelRegistration:(id:string)=>client.data<void>("/rest/v1/rpc/cancel_event_registration",{method:"POST",body:JSON.stringify({target_event:id})}),
 attendance:()=>get("attendance_records","select=id,attendance_status,marked_at,attendance_sessions(title,starts_at,session_type)&order=marked_at.desc"),
 tasks:()=>get("task_assignments","select=id,assigned_at,tasks(id,title,description,priority,due_at,status,created_at)&order=assigned_at.desc"),
 startTask:(task_id:string)=>client.data<void>("/rest/v1/rpc/start_assigned_task",{method:"POST",body:JSON.stringify({target_task:task_id})}),
 submitTask:async(task_id:string,submission_text:string,file?:File,userId?:string)=>{let attachment_path:string|null=null;if(file){if(file.size>10*1024*1024)throw new Error("Task attachment exceeds the 10 MB limit.");const allowed=["application/pdf","image/jpeg","image/png","application/vnd.openxmlformats-officedocument.wordprocessingml.document","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];if(!allowed.includes(file.type))throw new Error("This task attachment type is not allowed.");if(!userId)throw new Error("Member identity unavailable.");attachment_path=`${userId}/${task_id}/${crypto.randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g,"-").slice(-80)}`;await client.upload("members-task-submissions",attachment_path,file);}return post("task_submissions",{task_id,submission_text,attachment_path});},
 directory:()=>get("member_directory","select=full_name,profile_photo_url,designation,committee,skills,bio&order=full_name.asc"),
 announcements:()=>get("announcements","select=id,title,message,category,priority,published_at,expires_at&order=published_at.desc"),
 notifications:()=>get("notifications","select=id,title,message,category,link,read_at,created_at&order=created_at.desc"),
 markRead:(id:string)=>patch("notifications",`id=eq.${encodeURIComponent(id)}`,{read_at:new Date().toISOString()}),
 documents:()=>get("documents","select=id,title,description,category,storage_path,mime_type,file_size,audience,created_at&order=created_at.desc"),
 permissions:()=>get("member_permissions","select=permission"),
 createEvent:(value:unknown)=>post("events",value),
 createSession:(value:unknown)=>post("attendance_sessions",value),
 markAttendance:(session_id:string,user_id:string,attendance_status:string,reason:string)=>client.data<void>("/rest/v1/rpc/mark_attendance",{method:"POST",body:JSON.stringify({target_session:session_id,target_user:user_id,new_status:attendance_status,change_reason:reason})}),
 createTaskWithAssignment:(value:{task_title:string;task_description:string;task_priority:string;task_due_at:string|null;target_user:string})=>client.data<string>("/rest/v1/rpc/create_task_with_assignment",{method:"POST",body:JSON.stringify(value)}),
 taskSubmissions:()=>get("task_submissions","select=id,task_id,user_id,submission_text,attachment_path,submitted_at,review_status&order=submitted_at.desc"),
 reviewTask:(id:string,review_status:"Approved"|"Rejected",review_comment:string)=>client.data<void>("/rest/v1/rpc/review_task_submission",{method:"POST",body:JSON.stringify({target_submission:id,new_status:review_status,review_reason:review_comment})}),
 createAnnouncement:(value:unknown)=>post("announcements",value),
 uploadDocument:async(file:File,meta:{title:string;description:string;category:string;audience:string;uploaded_by:string})=>{if(file.size>20*1024*1024)throw new Error("File exceeds the 20 MB limit.");const allowed=["application/pdf","image/jpeg","image/png","application/vnd.openxmlformats-officedocument.wordprocessingml.document","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"];if(!allowed.includes(file.type))throw new Error("This file type is not allowed.");const safe=file.name.replace(/[^a-zA-Z0-9._-]/g,"-").slice(-100);const path=`${meta.uploaded_by}/${crypto.randomUUID()}-${safe}`;await client.upload("members-documents",path,file);await post("documents",{...meta,storage_path:path,mime_type:file.type,file_size:file.size});},
 signedDocument:(path:string)=>client.data<{signedURL:string}>("/storage/v1/object/sign/members-documents/"+path.split("/").map(encodeURIComponent).join("/").replaceAll("%2F","/"),{method:"POST",body:JSON.stringify({expiresIn:120})}),
 signedTaskAttachment:(path:string)=>client.data<{signedURL:string}>("/storage/v1/object/sign/members-task-submissions/"+path.split("/").map(encodeURIComponent).join("/").replaceAll("%2F","/"),{method:"POST",body:JSON.stringify({expiresIn:120})}),
};
};
export const operations=createOperations(authClient);
export const adminOperations=createOperations(adminAuthClient);
