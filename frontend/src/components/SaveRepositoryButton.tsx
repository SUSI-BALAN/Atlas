import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { lookupSaved, saveRepository, unsaveRepository } from "../services/api";
import type { RepositorySource } from "../types/api";

export function SaveRepositoryButton({jobId,repositoryId,source,externalId}:{jobId:string;repositoryId?:string;source:RepositorySource;externalId:string}){
  const client=useQueryClient();const key=["saved-lookup",source,externalId];
  const lookup=useQuery({queryKey:key,queryFn:()=>lookupSaved(source,externalId),retry:false});
  const mutation=useMutation({mutationFn:async():Promise<void>=>{if(lookup.data)await unsaveRepository(lookup.data.savedId);else await saveRepository(jobId,repositoryId!);},onSuccess:()=>{void client.invalidateQueries({queryKey:key});void client.invalidateQueries({queryKey:["saved"]});void client.invalidateQueries({queryKey:["workspace-summary"]});}});
  if(!repositoryId)return null;
  return <button className="button" type="button" disabled={lookup.isPending||mutation.isPending} onClick={()=>mutation.mutate()}>{mutation.isPending?"Updating…":lookup.data?"Saved · Unsave":"Save"}</button>;
}
