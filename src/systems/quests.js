class QuestEngine{
 constructor(game){this.game=game}
 data(id){return this.game.world.content.quests.find(q=>q.id===id)}
 state(id){return this.game.save.quests[id]}
 available(q){return !this.state(q.id)&&q.prerequisites.every(id=>this.state(id)?.status==='done')}
 accept(id){let q=this.data(id);if(!q)return this.game.notify('Unknown quest');if(!this.available(q)){this.game.notify(this.state(id)?'Already recorded':'Previous contract required');return false}this.game.save.quests[id]={status:'active',stage:0};this.game.notify('CONTRACT ACCEPTED · '+q.title);this.game.store();return true}
 progress(q){let s=this.state(q.id);return s&&s.status==='active'?q.stages[s.stage]:null}
 emit(kind,id){let any=false;for(const q of this.game.world.content.quests){let state=this.state(q.id),stage=this.progress(q);if(!stage||stage.type!==kind)continue;if(kind==='extract'||stage.targetId===id){state.stage++;any=true;this.game.notify('OBJECTIVE COMPLETE · '+q.title);if(state.stage>=q.stages.length)this.finish(q.id)}}if(any)this.game.store();return any}
 finish(id){let q=this.data(id),s=this.state(id);if(!q||s?.status!=='active')return false;s.status='done';for(const {itemId,quantity} of (q.rewards.items||[]))addItem(this.game.save.bag,itemId,quantity);this.game.save.gold+=q.rewards.coins||0;this.game.notify('CONTRACT COMPLETED · '+q.title+' +'+(q.rewards.coins||0)+' scrip');this.game.store();return true}
 current(){return this.game.world.content.quests.find(q=>this.progress(q))||this.game.world.content.quests.find(q=>this.available(q))||null}
}
